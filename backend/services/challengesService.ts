/**
 * Challenges Backend Service
 * Handles all challenge-related database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export interface Challenge {
  id: string;
  user_id: string;
  student_profile_id?: string;
  title: string;
  description?: string;
  type: string;
  difficulty: string;
  target_count: number;
  current_count: number;
  is_completed: boolean;
  xp_reward: number;
  expires_at?: string;
  created_at: string;
}

export interface SaveChallengeInput {
  title: string;
  description?: string;
  type: string;
  difficulty: string;
  target_count: number;
  xp_reward: number;
  expires_at?: string;
}

/**
 * Get challenges for a user
 */
export async function getChallenges(
  userId: string,
  profileId: string | null = null
): Promise<{ success: boolean; challenges: Challenge[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, challenges: [], error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    let query = supabase
      .from("challenges")
      .select("*")
      .eq("user_id", userId);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching challenges", { error: error.message, userId });
      return { success: false, challenges: [], error: error.message };
    }

    logger.debug("Challenges fetched", { count: data?.length || 0, userId });
    return { success: true, challenges: (data || []) as Challenge[] };
  } catch (error) {
    logger.error("Exception fetching challenges", { error, userId });
    return { success: false, challenges: [], error: String(error) };
  }
}

/**
 * Save a challenge
 */
export async function saveChallenge(
  userId: string,
  input: SaveChallengeInput,
  profileId: string | null = null
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    const insertData: any = {
      user_id: userId,
      student_profile_id: effectiveProfileId,
      title: input.title,
      description: input.description,
      type: input.type,
      difficulty: input.difficulty,
      target_count: input.target_count,
      current_count: 0,
      is_completed: false,
      xp_reward: input.xp_reward,
      expires_at: input.expires_at,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("challenges")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      logger.error("Error saving challenge", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    logger.info("Challenge saved", { id: (data as any).id, userId });
    return { success: true, id: (data as any).id };
  } catch (error) {
    logger.error("Exception saving challenge", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Update challenge progress
 */
export async function updateChallengeProgress(
  userId: string,
  challengeId: string,
  currentCount: number
): Promise<{ success: boolean; isCompleted: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, isCompleted: false, error: "Database not configured" };
    }

    // Get challenge to check target
    const { data: challenge, error: fetchError } = await supabase
      .from("challenges")
      .select("target_count")
      .eq("id", challengeId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !challenge) {
      return { success: false, isCompleted: false, error: "Challenge not found" };
    }

    const targetCount = (challenge as any).target_count;
    const isCompleted = currentCount >= targetCount;

    const { error } = await supabase
      .from("challenges")
      .update({
        current_count: currentCount,
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", challengeId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Error updating challenge", { error: error.message, challengeId });
      return { success: false, isCompleted: false, error: error.message };
    }

    logger.debug("Challenge progress updated", { challengeId, currentCount, isCompleted });
    return { success: true, isCompleted };
  } catch (error) {
    logger.error("Exception updating challenge", { error, challengeId });
    return { success: false, isCompleted: false, error: String(error) };
  }
}

/**
 * Complete a challenge
 */
export async function completeChallenge(
  userId: string,
  challengeId: string
): Promise<{ success: boolean; xpReward: number; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, xpReward: 0, error: "Database not configured" };
    }

    // Get challenge XP reward
    const { data: challenge, error: fetchError } = await supabase
      .from("challenges")
      .select("xp_reward, target_count")
      .eq("id", challengeId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !challenge) {
      return { success: false, xpReward: 0, error: "Challenge not found" };
    }

    const xpReward = (challenge as any).xp_reward || 0;

    const { error } = await supabase
      .from("challenges")
      .update({
        is_completed: true,
        current_count: (challenge as any).target_count,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", challengeId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Error completing challenge", { error: error.message, challengeId });
      return { success: false, xpReward: 0, error: error.message };
    }

    logger.info("Challenge completed", { challengeId, xpReward, userId });
    return { success: true, xpReward };
  } catch (error) {
    logger.error("Exception completing challenge", { error, challengeId });
    return { success: false, xpReward: 0, error: String(error) };
  }
}

/**
 * Delete a challenge
 */
export async function deleteChallenge(
  userId: string,
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { error } = await supabase
      .from("challenges")
      .delete()
      .eq("id", challengeId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Error deleting challenge", { error: error.message, challengeId });
      return { success: false, error: error.message };
    }

    logger.info("Challenge deleted", { challengeId, userId });
    return { success: true };
  } catch (error) {
    logger.error("Exception deleting challenge", { error, challengeId });
    return { success: false, error: String(error) };
  }
}
