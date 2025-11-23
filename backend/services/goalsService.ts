/**
 * Goals Backend Service
 * Handles all learning goals database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

// Types
interface Goal {
  id: string;
  user_id: string;
  student_profile_id: string | null;
  goal_type: string;
  target_subject: string;
  target_date: string | null;
  progress: number;
  status: "active" | "completed" | "paused" | "cancelled";
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface CreateGoalInput {
  goal_type: string;
  target_subject: string;
  target_date?: string | null;
  metadata?: Record<string, any>;
}

interface UpdateGoalInput {
  progress?: number;
  status?: "active" | "completed" | "paused" | "cancelled";
  target_date?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Get goals for a user
 */
export async function getGoals(
  userId: string,
  profileId: string | null,
  status?: "active" | "completed" | "paused" | "cancelled"
): Promise<{ success: boolean; goals?: Goal[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    let query = supabase
      .from("learning_goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (profileId && profileId !== "null") {
      query = query.eq("student_profile_id", profileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching goals", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    return { success: true, goals: (data || []) as Goal[] };
  } catch (error) {
    logger.error("Error in getGoals", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Create a new goal
 */
export async function createGoal(
  userId: string,
  profileId: string | null,
  input: CreateGoalInput
): Promise<{ success: boolean; goal?: Goal; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    const { data, error } = await (supabase as any)
      .from("learning_goals")
      .insert({
        user_id: userId,
        student_profile_id: effectiveProfileId,
        goal_type: input.goal_type,
        target_subject: input.target_subject,
        target_date: input.target_date || null,
        progress: 0,
        status: "active",
        metadata: input.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating goal", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    logger.info("Goal created", { goalId: data.id, userId, goalType: input.goal_type });

    return { success: true, goal: data as Goal };
  } catch (error) {
    logger.error("Error in createGoal", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Update a goal
 */
export async function updateGoal(
  userId: string,
  goalId: string,
  input: UpdateGoalInput
): Promise<{ success: boolean; goal?: Goal; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.progress !== undefined) updateData.progress = input.progress;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.target_date !== undefined) updateData.target_date = input.target_date;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    if (input.status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await (supabase as any)
      .from("learning_goals")
      .update(updateData)
      .eq("id", goalId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating goal", { error: error.message, userId, goalId });
      return { success: false, error: error.message };
    }

    logger.info("Goal updated", { goalId, userId, status: input.status });

    return { success: true, goal: data as Goal };
  } catch (error) {
    logger.error("Error in updateGoal", { error, userId, goalId });
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(
  userId: string,
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { error } = await (supabase as any)
      .from("learning_goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Error deleting goal", { error: error.message, userId, goalId });
      return { success: false, error: error.message };
    }

    logger.info("Goal deleted", { goalId, userId });

    return { success: true };
  } catch (error) {
    logger.error("Error in deleteGoal", { error, userId, goalId });
    return { success: false, error: String(error) };
  }
}

/**
 * Complete a goal (convenience method)
 */
export async function completeGoal(
  userId: string,
  goalId: string
): Promise<{ success: boolean; goal?: Goal; error?: string }> {
  return updateGoal(userId, goalId, { status: "completed", progress: 100 });
}

/**
 * Goal Templates - Predefined goals users can quickly add
 */
export const goalTemplates = [
  {
    id: "algebra-mastery",
    name: "Master Algebra",
    goal_type: "subject_mastery",
    target_subject: "Algebra",
    description: "Build strong algebraic foundations",
    estimatedDays: 30,
    targetProblems: 50,
  },
  {
    id: "geometry-basics",
    name: "Geometry Foundations",
    goal_type: "subject_mastery",
    target_subject: "Geometry",
    description: "Learn shapes, angles, and proofs",
    estimatedDays: 21,
    targetProblems: 40,
  },
  {
    id: "sat-prep",
    name: "SAT Math Prep",
    goal_type: "exam_prep",
    target_subject: "SAT Math",
    description: "Prepare for SAT math section",
    estimatedDays: 60,
    targetProblems: 100,
  },
  {
    id: "daily-practice",
    name: "Daily Practice Habit",
    goal_type: "practice_hours",
    target_subject: "Daily Practice",
    description: "Build consistent practice habit",
    estimatedDays: 7,
    targetProblems: 35,
  },
  {
    id: "calculus-intro",
    name: "Intro to Calculus",
    goal_type: "skill_building",
    target_subject: "Calculus",
    description: "Learn derivatives and integrals",
    estimatedDays: 45,
    targetProblems: 60,
  },
  {
    id: "problem-solving",
    name: "Problem Solving Skills",
    goal_type: "skill_building",
    target_subject: "Word Problems",
    description: "Master multi-step word problems",
    estimatedDays: 14,
    targetProblems: 30,
  },
];

/**
 * Get goal analytics for a user
 */
export async function getGoalAnalytics(
  userId: string,
  profileId: string | null
): Promise<{
  success: boolean;
  analytics?: {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    overallProgress: number;
    goalsCompletedThisMonth: number;
    averageCompletionTime: number;
    streakDays: number;
    goalsByType: Record<string, number>;
    recentActivity: Array<{
      goalId: string;
      goalName: string;
      action: string;
      date: string;
    }>;
  };
  error?: string;
}> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    // Get all goals
    let query = supabase
      .from("learning_goals")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (profileId && profileId !== "null") {
      query = query.eq("student_profile_id", profileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data: goals, error } = await query;

    if (error) {
      logger.error("Error fetching goals for analytics", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    const allGoals = (goals || []) as Goal[];
    const activeGoals = allGoals.filter(g => g.status === "active");
    const completedGoals = allGoals.filter(g => g.status === "completed");

    // Calculate overall progress
    const totalProgress = activeGoals.reduce((sum, g) => sum + g.progress, 0);
    const overallProgress = activeGoals.length > 0
      ? Math.round(totalProgress / activeGoals.length)
      : 0;

    // Goals completed this month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const goalsCompletedThisMonth = completedGoals.filter(g =>
      g.completed_at && new Date(g.completed_at) >= firstOfMonth
    ).length;

    // Average completion time (days)
    const completionTimes = completedGoals
      .filter(g => g.completed_at)
      .map(g => {
        const created = new Date(g.created_at);
        const completed = new Date(g.completed_at!);
        return Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
    const averageCompletionTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    // Goals by type
    const goalsByType: Record<string, number> = {};
    allGoals.forEach(g => {
      goalsByType[g.goal_type] = (goalsByType[g.goal_type] || 0) + 1;
    });

    // Recent activity (last 5 updates)
    const recentActivity = allGoals.slice(0, 5).map(g => ({
      goalId: g.id,
      goalName: g.target_subject,
      action: g.status === "completed" ? "completed" : g.progress > 0 ? "progress" : "created",
      date: g.updated_at,
    }));

    // Calculate streak days from XP data
    let streakDays = 0;
    try {
      const xpQuery = supabase
        .from("user_xp")
        .select("current_streak")
        .eq("user_id", userId);

      if (profileId && profileId !== "null") {
        xpQuery.eq("profile_id", profileId);
      } else {
        xpQuery.is("profile_id", null);
      }

      const { data: xpData } = await xpQuery.single();
      streakDays = xpData?.current_streak || 0;
    } catch {
      // Ignore streak errors
    }

    return {
      success: true,
      analytics: {
        totalGoals: allGoals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        overallProgress,
        goalsCompletedThisMonth,
        averageCompletionTime,
        streakDays,
        goalsByType,
        recentActivity,
      },
    };
  } catch (error) {
    logger.error("Error in getGoalAnalytics", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Create goal from template
 */
export async function createGoalFromTemplate(
  userId: string,
  profileId: string | null,
  templateId: string
): Promise<{ success: boolean; goal?: Goal; error?: string }> {
  const template = goalTemplates.find(t => t.id === templateId);

  if (!template) {
    return { success: false, error: "Template not found" };
  }

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + template.estimatedDays);

  return createGoal(userId, profileId, {
    goal_type: template.goal_type,
    target_subject: template.target_subject,
    target_date: targetDate.toISOString().split("T")[0],
    metadata: {
      templateId: template.id,
      targetProblems: template.targetProblems,
      description: template.description,
    },
  });
}
