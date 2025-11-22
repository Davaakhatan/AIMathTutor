/**
 * XP Backend Service - Server-side only
 * Handles all XP-related database operations
 * This service should ONLY be imported in API routes, never in client code
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import type { XPData, XPUpdatePayload, XPHistoryEntry } from "../types";

// XP calculation constants
const BASE_XP_PER_PROBLEM = 15;
const HINT_PENALTY = 2;

/**
 * Get XP data for a user
 */
export async function getXP(
  userId: string,
  profileId: string | null = null
): Promise<XPData | null> {
  const supabase = getSupabaseServer();

  logger.debug("Backend: Fetching XP", { userId, profileId });

  const { data, error } = await supabase
    .from("xp_data")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    logger.error("Backend: Error fetching XP", { error: error.message, userId });
    throw new Error(error.message);
  }

  // Filter by student_profile_id in memory (Supabase .is() is unreliable)
  const filtered = data?.filter((r: any) =>
    profileId ? r.student_profile_id === profileId : r.student_profile_id === null
  ) || [];

  if (filtered.length === 0) {
    return null;
  }

  // Get record with highest XP if duplicates exist
  const xpRow = filtered.sort((a: any, b: any) => {
    const xpDiff = (b.total_xp || 0) - (a.total_xp || 0);
    if (xpDiff !== 0) return xpDiff;
    return new Date(b.updated_at || b.created_at).getTime() -
           new Date(a.updated_at || a.created_at).getTime();
  })[0];

  return {
    id: xpRow.id,
    user_id: xpRow.user_id,
    student_profile_id: xpRow.student_profile_id,
    total_xp: xpRow.total_xp || 0,
    level: xpRow.level || 1,
    xp_to_next_level: xpRow.xp_to_next_level || 100,
    xp_history: xpRow.xp_history || [],
  };
}

/**
 * Update XP data for a user
 */
export async function updateXP(
  userId: string,
  payload: XPUpdatePayload,
  profileId: string | null = null
): Promise<boolean> {
  const supabase = getSupabaseServer();

  logger.debug("Backend: Updating XP", { userId, profileId, totalXP: payload.total_xp });

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
    .from("xp_data")
    .select("id, student_profile_id")
    .eq("user_id", userId);

  const match = existing?.find((r: any) =>
    profileId ? r.student_profile_id === profileId : r.student_profile_id === null
  );

  if (match) {
    // Update existing
    const { error } = await supabase
      .from("xp_data")
      .update(updateData)
      .eq("id", match.id);

    if (error) {
      logger.error("Backend: Error updating XP", { error: error.message, userId });
      return false;
    }
  } else {
    // Insert new
    const { error } = await supabase
      .from("xp_data")
      .insert(updateData);

    if (error) {
      if (error.code === "23505") {
        // Duplicate key - retry update
        return updateXP(userId, payload, profileId);
      }
      logger.error("Backend: Error inserting XP", { error: error.message, userId });
      return false;
    }
  }

  logger.info("Backend: XP updated successfully", {
    userId,
    totalXP: payload.total_xp,
    level: payload.level
  });
  return true;
}

/**
 * Award XP for completing a problem
 */
export async function awardProblemXP(
  userId: string,
  problemType: string,
  difficulty: string = "medium",
  hintsUsed: number = 0,
  profileId: string | null = null
): Promise<{ success: boolean; xpGained: number; newTotal: number; newLevel: number }> {
  logger.info("Backend: Awarding problem XP", { userId, problemType, difficulty, hintsUsed });

  // Get current XP
  let currentXP = await getXP(userId, profileId);

  if (!currentXP) {
    // Create default XP data
    currentXP = {
      user_id: userId,
      student_profile_id: profileId,
      total_xp: 0,
      level: 1,
      xp_to_next_level: 100,
      xp_history: [],
    };
  }

  // Calculate XP gained
  const xpGained = calculateXPForProblem(difficulty, hintsUsed);
  const newTotal = currentXP.total_xp + xpGained;
  const newLevel = calculateLevel(newTotal);
  const xpToNext = calculateXPForLevel(newLevel + 1) - newTotal;

  // Update history
  const today = new Date().toISOString().split("T")[0];
  const newHistory: XPHistoryEntry[] = [
    ...currentXP.xp_history,
    {
      date: today,
      xp: xpGained,
      reason: `Solved ${problemType} problem`,
      timestamp: Date.now(),
    },
  ];

  // Save to database
  const success = await updateXP(userId, {
    total_xp: newTotal,
    level: newLevel,
    xp_to_next_level: xpToNext,
    xp_history: newHistory,
  }, profileId);

  if (success) {
    logger.info("Backend: Problem XP awarded", { userId, xpGained, newTotal, newLevel });
  }

  return { success, xpGained, newTotal, newLevel };
}

/**
 * Award login bonus XP
 */
export async function awardLoginBonus(
  userId: string,
  isFirstLogin: boolean,
  profileId: string | null = null
): Promise<{ success: boolean; xpGained: number }> {
  let currentXP = await getXP(userId, profileId);

  if (!currentXP) {
    currentXP = {
      user_id: userId,
      student_profile_id: profileId,
      total_xp: 0,
      level: 1,
      xp_to_next_level: 100,
      xp_history: [],
    };
  }

  const xpGained = isFirstLogin ? 60 : 10; // First login + daily vs just daily
  const newTotal = currentXP.total_xp + xpGained;
  const newLevel = calculateLevel(newTotal);
  const xpToNext = calculateXPForLevel(newLevel + 1) - newTotal;

  const today = new Date().toISOString().split("T")[0];
  const reason = isFirstLogin ? "First Login Bonus + Daily Login" : "Daily Login Bonus";

  const newHistory: XPHistoryEntry[] = [
    ...currentXP.xp_history,
    {
      date: today,
      xp: xpGained,
      reason,
      timestamp: Date.now(),
    },
  ];

  const success = await updateXP(userId, {
    total_xp: newTotal,
    level: newLevel,
    xp_to_next_level: xpToNext,
    xp_history: newHistory,
  }, profileId);

  return { success, xpGained };
}

// Helper functions
function calculateXPForProblem(difficulty: string = "medium", hintsUsed: number = 0): number {
  const difficultyMultiplier = {
    easy: 0.8,
    medium: 1,
    hard: 1.5,
    elementary: 0.6,
    middle: 1,
    high: 1.3,
    advanced: 1.8,
  }[difficulty.toLowerCase()] || 1;

  const penalty = hintsUsed * HINT_PENALTY;
  return Math.max(5, Math.round(BASE_XP_PER_PROBLEM * difficultyMultiplier - penalty));
}

function calculateLevel(totalXP: number): number {
  let level = 1;
  let xpRequired = 100;
  let accumulatedXP = 0;

  while (accumulatedXP + xpRequired <= totalXP) {
    accumulatedXP += xpRequired;
    level++;
    xpRequired = Math.round(100 * level * 1.5);
  }

  return level;
}

function calculateXPForLevel(level: number): number {
  let totalXP = 0;
  for (let i = 1; i < level; i++) {
    totalXP += Math.round(100 * i * 1.5);
  }
  return totalXP;
}

async function ensureProfileExists(supabase: any, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // Profile doesn't exist, create it
    const { error: createError } = await supabase
      .from("profiles")
      .insert({ id: userId, role: "student" });

    if (createError && createError.code !== "23505") {
      logger.error("Backend: Failed to create profile", { error: createError.message, userId });
    }
  }
}
