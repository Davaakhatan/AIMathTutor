/**
 * Streak Backend Service - Server-side only
 * Handles all streak-related database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import type { StreakData, StreakUpdatePayload } from "../types";

/**
 * Get streak data for a user
 */
export async function getStreak(
  userId: string,
  profileId: string | null = null
): Promise<StreakData | null> {
  const supabase = getSupabaseServer();

  logger.debug("Backend: Fetching streak", { userId, profileId });

  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    logger.error("Backend: Error fetching streak", { error: error.message, userId });
    throw new Error(error.message);
  }

  // Filter by student_profile_id in memory
  // For teachers viewing a student: also include null records (legacy data before profile system)
  const filtered = data?.filter((r: any) =>
    profileId
      ? r.student_profile_id === profileId || r.student_profile_id == null
      : r.student_profile_id == null
  ) || [];

  if (filtered.length === 0) {
    return null;
  }

  const row = filtered[0];
  return {
    id: row.id,
    user_id: row.user_id,
    student_profile_id: row.student_profile_id,
    current_streak: row.current_streak || 0,
    longest_streak: row.longest_streak || 0,
    last_study_date: row.last_study_date || null,
  };
}

/**
 * Update streak data for a user
 */
export async function updateStreak(
  userId: string,
  payload: StreakUpdatePayload,
  profileId: string | null = null
): Promise<boolean> {
  const supabase = getSupabaseServer();

  logger.debug("Backend: Updating streak", { userId, profileId, streak: payload.current_streak });

  // Ensure profile exists first
  await ensureProfileExists(supabase, userId);

  const updateData = {
    ...payload,
    user_id: userId,
    student_profile_id: profileId,
    updated_at: new Date().toISOString(),
  };

  // Find existing record
  const { data: existing } = await supabase
    .from("streaks")
    .select("id, student_profile_id")
    .eq("user_id", userId);

  const match = existing?.find((r: any) =>
    profileId ? r.student_profile_id === profileId : r.student_profile_id === null
  );

  if (match) {
    const { error } = await supabase
      .from("streaks")
      .update(updateData)
      .eq("id", match.id);

    if (error) {
      logger.error("Backend: Error updating streak", { error: error.message, userId });
      return false;
    }
  } else {
    const { error } = await supabase
      .from("streaks")
      .insert(updateData);

    if (error) {
      if (error.code === "23505") {
        return updateStreak(userId, payload, profileId);
      }
      logger.error("Backend: Error inserting streak", { error: error.message, userId });
      return false;
    }
  }

  logger.info("Backend: Streak updated successfully", { userId, streak: payload.current_streak });
  return true;
}

/**
 * Increment streak for study activity
 */
export async function incrementStreak(
  userId: string,
  profileId: string | null = null
): Promise<{ success: boolean; currentStreak: number; longestStreak: number }> {
  const today = new Date().toISOString().split("T")[0];

  let streakData = await getStreak(userId, profileId);

  if (!streakData) {
    streakData = {
      user_id: userId,
      student_profile_id: profileId,
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null,
    };
  }

  // Check if already studied today
  if (streakData.last_study_date === today) {
    return {
      success: true,
      currentStreak: streakData.current_streak,
      longestStreak: streakData.longest_streak,
    };
  }

  // Check if streak continues or resets
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak: number;
  if (streakData.last_study_date === yesterdayStr) {
    // Continue streak
    newStreak = streakData.current_streak + 1;
  } else if (streakData.last_study_date === null) {
    // First study
    newStreak = 1;
  } else {
    // Streak broken, restart
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, streakData.longest_streak);

  const success = await updateStreak(userId, {
    current_streak: newStreak,
    longest_streak: longestStreak,
    last_study_date: today,
  }, profileId);

  return { success, currentStreak: newStreak, longestStreak };
}

async function ensureProfileExists(supabase: any, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    const { error: createError } = await supabase
      .from("profiles")
      .insert({ id: userId, role: "student" });

    if (createError && createError.code !== "23505") {
      logger.error("Backend: Failed to create profile", { error: createError.message, userId });
    }
  }
}
