/**
 * Learning Paths Backend Service
 * Handles all learning path database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { LearningPath, LearningPathStep } from "@/services/learningPathGenerator";

/**
 * Get learning path for a user
 */
export async function getLearningPath(
  userId: string,
  profileId: string | null
): Promise<{ success: boolean; path?: LearningPath | null; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    // Query learning path
    let query = supabase
      .from("learning_paths")
      .select("*")
      .eq("user_id", userId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching learning path", { error: error.message, userId, effectiveProfileId });
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, path: null };
    }

    const pathData = data[0] as any;

    const learningPath: LearningPath = {
      id: pathData.id,
      goal: pathData.goal,
      targetConcepts: pathData.target_concepts || [],
      steps: (pathData.steps || []) as LearningPathStep[],
      currentStep: pathData.current_step || 0,
      createdAt: new Date(pathData.created_at).getTime(),
      lastUpdated: new Date(pathData.updated_at).getTime(),
      progress: pathData.progress || 0,
      status: (pathData.status as "active" | "completed" | "archived") || "active",
      completedAt: pathData.completed_at ? new Date(pathData.completed_at).getTime() : undefined,
    };

    logger.debug("Learning path fetched", { pathId: learningPath.id, goal: learningPath.goal });

    return { success: true, path: learningPath };
  } catch (error) {
    logger.error("Error in getLearningPath", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Save or update a learning path
 */
export async function saveLearningPath(
  userId: string,
  path: LearningPath,
  profileId: string | null
): Promise<{ success: boolean; path?: LearningPath; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    const pathData: any = {
      user_id: userId,
      student_profile_id: effectiveProfileId,
      goal: path.goal,
      target_concepts: path.targetConcepts || [],
      steps: path.steps || [],
      current_step: path.currentStep || 0,
      progress: path.progress || 0,
      status: path.status || "active",
      updated_at: new Date().toISOString(),
    };

    if (path.status === "completed" && path.completedAt) {
      pathData.completed_at = new Date(path.completedAt).toISOString();
    }

    let result;
    if (path.id) {
      // Update existing path
      const { data, error } = await (supabase as any)
        .from("learning_paths")
        .update(pathData)
        .eq("id", path.id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating learning path", { error: error.message, userId });
        return { success: false, error: error.message };
      }

      result = data;
    } else {
      // Archive existing active path
      let checkQuery = supabase
        .from("learning_paths")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);

      if (effectiveProfileId) {
        checkQuery = checkQuery.eq("student_profile_id", effectiveProfileId);
      } else {
        checkQuery = checkQuery.is("student_profile_id", null);
      }

      const { data: existingActive } = await checkQuery;

      if (existingActive && existingActive.length > 0) {
        const existingActivePath = existingActive[0] as any;
        await (supabase as any)
          .from("learning_paths")
          .update({ status: "archived", updated_at: new Date().toISOString() })
          .eq("id", existingActivePath.id);
      }

      // Insert new path
      const { data, error } = await (supabase as any)
        .from("learning_paths")
        .insert(pathData)
        .select()
        .single();

      if (error) {
        logger.error("Error creating learning path", { error: error.message, userId });
        return { success: false, error: error.message };
      }

      result = data;
    }

    const learningPath: LearningPath = {
      id: result.id,
      goal: result.goal,
      targetConcepts: result.target_concepts || [],
      steps: (result.steps || []) as LearningPathStep[],
      currentStep: result.current_step || 0,
      createdAt: new Date(result.created_at).getTime(),
      lastUpdated: new Date(result.updated_at).getTime(),
      progress: result.progress || 0,
      status: (result.status as "active" | "completed" | "archived") || "active",
      completedAt: result.completed_at ? new Date(result.completed_at).getTime() : undefined,
    };

    logger.debug("Learning path saved", { pathId: learningPath.id, goal: learningPath.goal });

    return { success: true, path: learningPath };
  } catch (error) {
    logger.error("Error in saveLearningPath", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Delete learning path
 */
export async function deleteLearningPath(
  userId: string,
  profileId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    let query = (supabase as any)
      .from("learning_paths")
      .delete()
      .eq("user_id", userId);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { error } = await query;

    if (error) {
      logger.error("Error deleting learning path", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    logger.debug("Learning path deleted", { userId, effectiveProfileId });

    return { success: true };
  } catch (error) {
    logger.error("Error in deleteLearningPath", { error, userId });
    return { success: false, error: String(error) };
  }
}
