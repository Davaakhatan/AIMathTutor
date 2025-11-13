/**
 * Goal System Service
 * Manages learning goals for the Study Companion
 * Helps students set, track, and achieve learning objectives
 */

import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";
import eventBus from "@/lib/eventBus";

export type GoalType = "subject_mastery" | "exam_prep" | "skill_building" | "daily_practice";
export type GoalStatus = "active" | "completed" | "paused" | "expired";

export interface LearningGoal {
  id?: string;
  user_id: string;
  student_profile_id?: string | null;
  goal_type: GoalType;
  target_subject: string;
  target_date?: string | null;
  status: GoalStatus;
  progress: number; // 0-100
  target_problems?: number;
  problems_completed?: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

/**
 * Create a new learning goal
 */
export async function createGoal(
  userId: string,
  goalData: {
    goalType: GoalType;
    targetSubject: string;
    targetDate?: string;
    targetProblems?: number;
    profileId?: string | null;
  }
): Promise<string | null> {
  try {
    logger.info("Creating learning goal", { userId, goalType: goalData.goalType, subject: goalData.targetSubject });

    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const insertData: any = {
      user_id: userId,
      student_profile_id: goalData.profileId,
      goal_type: goalData.goalType,
      target_subject: goalData.targetSubject,
      target_date: goalData.targetDate ? goalData.targetDate.split('T')[0] : null, // Convert to date format
      status: "active",
      progress: 0,
      target_problems: goalData.targetProblems || 10,
      problems_completed: 0,
      metadata: {},
    };

    const { data, error } = await supabase
      .from("learning_goals")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    // Emit event
    await eventBus.emit("goal_created", userId, {
      goalId: data.id,
      goalType: goalData.goalType,
      targetSubject: goalData.targetSubject,
    }, { profileId: goalData.profileId });

    logger.info("Learning goal created", { userId, goalId: data.id });
    return data.id;
  } catch (error) {
    logger.error("Error creating learning goal", { error, userId });
    return null;
  }
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(
  goalId: string,
  userId: string,
  problemType: string,
  profileId?: string | null
): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return false;
    }

    // Get the goal
    const { data: goal, error: fetchError } = await supabase
      .from("learning_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !goal) {
      logger.warn("Goal not found for progress update", { goalId, userId });
      return false;
    }

    // Check if problem matches goal subject
    const matchesGoal = goal.target_subject.toLowerCase().includes(problemType.toLowerCase()) ||
                        problemType.toLowerCase().includes(goal.target_subject.toLowerCase());

    if (!matchesGoal) {
      logger.debug("Problem type doesn't match goal subject", { problemType, goalSubject: goal.target_subject });
      return false;
    }

    // Update progress
    const newProblemsCompleted = (goal.problems_completed || 0) + 1;
    const newProgress = Math.min(100, Math.round((newProblemsCompleted / (goal.target_problems || 10)) * 100));
    const isCompleted = newProgress >= 100;

    const updateData: any = {
      problems_completed: newProblemsCompleted,
      progress: newProgress,
      updated_at: new Date().toISOString(),
    };

    if (isCompleted && goal.status !== "completed") {
      updateData.status = "completed";
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("learning_goals")
      .update(updateData)
      .eq("id", goalId);

    if (updateError) {
      throw updateError;
    }

    logger.info("Goal progress updated", { goalId, userId, progress: newProgress, isCompleted });

    // Emit events
    await eventBus.emit("goal_progress_updated", userId, {
      goalId,
      progress: newProgress,
      problemsCompleted: newProblemsCompleted,
    }, { profileId });

    if (isCompleted) {
      await eventBus.emit("goal_completed", userId, {
        goalId,
        goalType: goal.goal_type,
        targetSubject: goal.target_subject,
      }, { profileId });
    }

    return true;
  } catch (error) {
    logger.error("Error updating goal progress", { error, goalId, userId });
    return false;
  }
}

/**
 * Get active goals for user
 */
export async function getActiveGoals(
  userId: string,
  profileId?: string | null
): Promise<LearningGoal[]> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return [];
    }

    let query = supabase
      .from("learning_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    if (profileId) {
      query = query.eq("student_profile_id", profileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error fetching active goals", { error, userId });
    return [];
  }
}

/**
 * Check and update all active goals for a completed problem
 */
export async function checkGoalsForProblem(
  userId: string,
  problemType: string,
  profileId?: string | null
): Promise<void> {
  try {
    const activeGoals = await getActiveGoals(userId, profileId);
    
    if (activeGoals.length === 0) {
      logger.debug("No active goals to update", { userId });
      return;
    }

    logger.info("Checking active goals for problem completion", { 
      userId, 
      problemType, 
      activeGoalCount: activeGoals.length 
    });

    // Update each matching goal
    for (const goal of activeGoals) {
      if (goal.id) {
        await updateGoalProgress(goal.id, userId, problemType, profileId);
      }
    }
  } catch (error) {
    logger.error("Error checking goals for problem", { error, userId, problemType });
  }
}

