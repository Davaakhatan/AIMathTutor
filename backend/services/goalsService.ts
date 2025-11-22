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
