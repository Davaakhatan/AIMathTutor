/**
 * Goal Service
 * Handles learning goal creation, tracking, and completion
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

export interface LearningGoal {
  id: string;
  user_id: string;
  student_profile_id: string | null;
  goal_type: "subject_mastery" | "exam_prep" | "skill_building" | "practice_hours";
  target_subject: string;
  target_date: string | null;
  status: "active" | "completed" | "paused" | "cancelled";
  progress: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreateGoalInput {
  goal_type: LearningGoal["goal_type"];
  target_subject: string;
  target_date?: string | null;
  metadata?: Record<string, any>;
}

export interface UpdateGoalInput {
  progress?: number;
  status?: LearningGoal["status"];
  target_date?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Create a new learning goal
 */
export async function createGoal(
  userId: string,
  profileId: string | null,
  input: CreateGoalInput
): Promise<LearningGoal | null> {
  try {
    // CRITICAL: Ensure profile exists before creating goal
    const { ensureProfileExists } = await import("@/services/supabaseDataService");
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error("Supabase admin client not available for creating goal");
      return null;
    }

    const { data, error } = await supabase
      .from("learning_goals")
      .insert({
        user_id: userId,
        student_profile_id: profileId,
        goal_type: input.goal_type,
        target_subject: input.target_subject,
        target_date: input.target_date || null,
        status: "active",
        progress: 0,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating goal", { error: error.message, userId });
      return null;
    }

    logger.info("Learning goal created", {
      goalId: data.id,
      userId,
      goalType: input.goal_type,
      targetSubject: input.target_subject,
    });

    return data as LearningGoal;
  } catch (error) {
    logger.error("Error in createGoal", { error, userId });
    return null;
  }
}

/**
 * Get goals for a user
 */
export async function getGoals(
  userId: string,
  profileId?: string | null,
  status?: LearningGoal["status"]
): Promise<LearningGoal[]> {
  try {
    // CRITICAL: Ensure profile exists before querying
    const { ensureProfileExists } = await import("@/services/supabaseDataService");
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error("Supabase admin client not available for fetching goals");
      return [];
    }

    let query = supabase
      .from("learning_goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (profileId !== undefined) {
      if (profileId === null) {
        query = query.is("student_profile_id", null);
      } else {
        query = query.eq("student_profile_id", profileId);
      }
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching goals", { error: error.message, userId });
      return [];
    }

    return (data || []) as LearningGoal[];
  } catch (error) {
    logger.error("Error in getGoals", { error, userId });
    return [];
  }
}

/**
 * Update a goal
 */
export async function updateGoal(
  userId: string,
  goalId: string,
  input: UpdateGoalInput
): Promise<LearningGoal | null> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error("Supabase admin client not available for creating goal");
      return null;
    }

    const updateData: any = {};
    if (input.progress !== undefined) updateData.progress = Math.max(0, Math.min(100, input.progress));
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (input.target_date !== undefined) updateData.target_date = input.target_date;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const { data, error } = await supabase
      .from("learning_goals")
      .update(updateData)
      .eq("id", goalId)
      .eq("user_id", userId) // Ensure user owns the goal
      .select()
      .single();

    if (error) {
      logger.error("Error updating goal", { error: error.message, userId, goalId });
      return null;
    }

    logger.info("Goal updated", { goalId, userId, status: input.status, progress: input.progress });

    return data as LearningGoal;
  } catch (error) {
    logger.error("Error in updateGoal", { error, userId, goalId });
    return null;
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(userId: string, goalId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error("Supabase admin client not available for deleting goal");
      return false;
    }

    const { error } = await supabase
      .from("learning_goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", userId); // Ensure user owns the goal

    if (error) {
      logger.error("Error deleting goal", { error: error.message, userId, goalId });
      return false;
    }

    logger.info("Goal deleted", { goalId, userId });
    return true;
  } catch (error) {
    logger.error("Error in deleteGoal", { error, userId, goalId });
    return false;
  }
}

/**
 * Complete a goal
 */
export async function completeGoal(userId: string, goalId: string): Promise<LearningGoal | null> {
  return updateGoal(userId, goalId, {
    status: "completed",
    progress: 100,
  });
}

/**
 * Check goal progress based on user activity
 * This is called after problem completion to update goal progress
 */
export async function checkGoalProgress(
  userId: string,
  profileId: string | null,
  problemType: string,
  subject?: string
): Promise<{ updatedGoals: LearningGoal[]; completedGoals: LearningGoal[] }> {
  try {
    // Get active goals that might be affected by this problem
    const activeGoals = await getGoals(userId, profileId, "active");

    const updatedGoals: LearningGoal[] = [];
    const completedGoals: LearningGoal[] = [];

    for (const goal of activeGoals) {
      // Improved matching logic - check multiple ways
      const goalSubjectLower = goal.target_subject.toLowerCase().trim();
      const problemTypeLower = problemType.toLowerCase().trim();
      const subjectLower = subject?.toLowerCase().trim() || "";
      
      // Normalize common variations
      const normalizeSubject = (s: string) => {
        return s
          .replace(/\s+/g, " ")
          .replace(/[^a-z0-9\s]/g, "")
          .trim();
      };
      
      const normalizedGoal = normalizeSubject(goalSubjectLower);
      const normalizedProblem = normalizeSubject(problemTypeLower);
      const normalizedSubject = subjectLower ? normalizeSubject(subjectLower) : "";
      
      // Check if this problem type/subject matches the goal
      const matchesGoal =
        // Direct match
        normalizedGoal === normalizedProblem ||
        normalizedGoal === normalizedSubject ||
        // Contains match (more flexible)
        normalizedGoal.includes(normalizedProblem) ||
        normalizedProblem.includes(normalizedGoal) ||
        normalizedGoal.includes(normalizedSubject) ||
        normalizedSubject.includes(normalizedGoal) ||
        // Check common subject aliases
        (normalizedGoal.includes("algebra") && (normalizedProblem.includes("algebra") || normalizedSubject.includes("algebra"))) ||
        (normalizedGoal.includes("geometry") && (normalizedProblem.includes("geometry") || normalizedSubject.includes("geometry"))) ||
        (normalizedGoal.includes("calculus") && (normalizedProblem.includes("calculus") || normalizedSubject.includes("calculus"))) ||
        (normalizedGoal.includes("trig") && (normalizedProblem.includes("trig") || normalizedSubject.includes("trig")));

      if (matchesGoal) {
        // Simple progress update: increment by 5% per problem (can be made smarter)
        const newProgress = Math.min(100, goal.progress + 5);

        // Auto-complete goal if progress reaches 100%
        const shouldComplete = newProgress >= 100;

        const updatedGoal = await updateGoal(userId, goal.id, {
          progress: newProgress,
          status: shouldComplete ? "completed" : undefined,
        });

        if (updatedGoal) {
          updatedGoals.push(updatedGoal);

          // If goal is now complete, add to completed goals
          if (updatedGoal.status === "completed" || shouldComplete) {
            completedGoals.push(updatedGoal);
          }
        }
      }
    }

    return { updatedGoals, completedGoals };
  } catch (error) {
    logger.error("Error in checkGoalProgress", { error, userId });
    return { updatedGoals: [], completedGoals: [] };
  }
}

