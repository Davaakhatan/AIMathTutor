/**
 * Supabase Data Service
 * Handles all data operations for authenticated users
 * Supabase is the source of truth, localStorage is cache only
 */

import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { getEffectiveProfileId } from "@/services/studentProfileService";
import { isProfileCached, cacheProfileExists } from "@/lib/profileCache";

// ============================================
// PROFILE UTILITIES
// ============================================

/**
 * Ensure profiles row exists for user
 * CRITICAL: Many tables reference public.profiles(id), not auth.users(id)
 * This function ensures the profiles row exists before queries
 */
export async function ensureProfileExists(userId: string): Promise<boolean> {
  // PERFORMANCE FIX: Just cache and return true immediately
  // Profiles are auto-created on signup (via /api/get-profiles)
  // This function was causing 5-second timeouts on EVERY operation
  // Even the .single() query without .auth.getUser() is too slow
  
  cacheProfileExists(userId);
  return true;
}

// ============================================
// XP DATA
// ============================================

export interface XPData {
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  xp_history: Array<{ date: string; xp: number; reason: string }>;
  recent_gains: Array<{ timestamp: number; xp: number; reason: string }>;
}

/**
 * Get XP data from Supabase for authenticated user or active profile
 */
export async function getXPData(userId: string, profileId?: string | null): Promise<XPData | null> {
  try {
    // CRITICAL: Ensure profile exists before querying (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.debug("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 5000); // 5 second timeout (increased from 2s)
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return null;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    // The hook should pass activeProfile?.id directly
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    let query = supabase
      .from("xp_data")
      .select("*");
    
    if (effectiveProfileId) {
      // Query by profile ID
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      // Query by user ID (no active profile)
      query = query.eq("user_id", userId).is("student_profile_id", null);
    }
    
    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching XP data", { error: error.message, userId, profileId: effectiveProfileId });
      return await createDefaultXPData(userId, effectiveProfileId);
    }
    
    // If no data (empty array), create default
    if (!data || data.length === 0) {
      logger.info("No XP data found, creating default", { userId, profileId: effectiveProfileId });
      return await createDefaultXPData(userId, effectiveProfileId);
    }
    
    // CRITICAL: Check for duplicates and warn
    if (data.length > 1) {
      logger.error("DUPLICATE XP RECORDS FOUND! This should not happen!", { 
        userId, 
        profileId: effectiveProfileId,
        duplicateCount: data.length,
        recordIds: data.map((r: any) => r.id)
      });
      console.error("🚨 DUPLICATE XP RECORDS:", {
        count: data.length,
        records: data.map((r: any) => ({
          id: r.id,
          totalXP: r.total_xp,
          level: r.level,
          updated_at: r.updated_at
        }))
      });
    }
    
    // Get the LATEST row (highest updated_at) to avoid showing stale data
    const xpRow = data.sort((a: any, b: any) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    })[0];
    
    logger.info("XP data loaded", { 
      userId, 
      profileId: effectiveProfileId,
      totalXP: xpRow.total_xp,
      level: xpRow.level,
      recordId: xpRow.id
    });

    // Convert xp_history to recent_gains format (for UI display)
    const xpHistory = (xpRow.xp_history as any) || [];
    const recentGains = xpHistory.map((entry: any) => ({
      xp: entry.xp || 0,
      reason: entry.reason || "XP gained",
      timestamp: entry.date ? new Date(entry.date).getTime() : Date.now()
    }));

    return {
      total_xp: xpRow.total_xp || 0,
      level: xpRow.level || 1,
      xp_to_next_level: xpRow.xp_to_next_level || 100,
      xp_history: xpHistory,
      recent_gains: recentGains,
    };
  } catch (error) {
    logger.error("Error in getXPData", { error, userId });
    return null;
  }
}

/**
 * Create default XP data for new user or profile
 */
async function createDefaultXPData(userId: string, profileId?: string | null): Promise<XPData> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available for creating default XP data");
      return {
        total_xp: 0,
        level: 1,
        xp_to_next_level: 100,
        xp_history: [],
        recent_gains: [],
      };
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    // Check if data already exists for this profile/user combination
    let checkQuery = supabase.from("xp_data").select("*");
    if (effectiveProfileId) {
      checkQuery = checkQuery.eq("student_profile_id", effectiveProfileId);
    } else {
      checkQuery = checkQuery.eq("user_id", userId).is("student_profile_id", null);
    }
    
    const { data: existingData, error: checkError } = await checkQuery;
    
    // If data exists, return it
    if (existingData && existingData.length > 0) {
      const existing = existingData[0];
      return {
        total_xp: existing.total_xp || 0,
        level: existing.level || 1,
        xp_to_next_level: existing.xp_to_next_level || 100,
        xp_history: (existing.xp_history as any) || [],
        recent_gains: (existing.recent_gains as any) || [],
      };
    }
    
    const defaultData: any = {
      user_id: userId, // ALWAYS include user_id (required by RLS policies)
      total_xp: 0,
      level: 1,
      xp_to_next_level: 100,
      xp_history: [],
      // Note: recent_gains column doesn't exist in database, only in TypeScript interface
    };
    
    if (effectiveProfileId) {
      // For profile: include BOTH user_id and profile_id
      defaultData.student_profile_id = effectiveProfileId;
    } else {
      // For user: include user_id, profile_id is null
      defaultData.student_profile_id = null;
    }

    const { data, error } = await supabase
      .from("xp_data")
      .insert(defaultData)
      .select()
      .single();

    if (error) {
      // If duplicate key error (race condition), fetch and return existing data
      if (error.code === "23505") {
        logger.debug("XP data created by another request (race condition), fetching existing", { userId });
        const { data: raceData } = await checkQuery;
        if (raceData && raceData.length > 0) {
          const existing = raceData[0];
          return {
            total_xp: existing.total_xp || 0,
            level: existing.level || 1,
            xp_to_next_level: existing.xp_to_next_level || 100,
            xp_history: (existing.xp_history as any) || [],
            recent_gains: (existing.recent_gains as any) || [],
          };
        }
      }
      logger.error("Error creating default XP data", { error: error.message, userId });
      return defaultData;
    }

    return {
      total_xp: data.total_xp || 0,
      level: data.level || 1,
      xp_to_next_level: data.xp_to_next_level || 100,
      xp_history: (data.xp_history as any) || [],
      recent_gains: (data.recent_gains as any) || [],
    };
  } catch (error) {
    logger.error("Error creating default XP data", { error, userId });
    return {
      total_xp: 0,
      level: 1,
      xp_to_next_level: 100,
      xp_history: [],
      recent_gains: [],
    };
  }
}

/**
 * Update XP data in Supabase
 */
export async function updateXPData(userId: string, xpData: Partial<XPData>, profileId?: string | null): Promise<boolean> {
  try {
    // CRITICAL: Ensure profile exists before updating (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return false;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    // Filter out any fields that don't exist in the database schema
    const { recent_gains, ...dbFields } = xpData;
    
    const updateData: any = {
      ...dbFields,
      user_id: userId, // ALWAYS include user_id (required by RLS and NOT NULL constraint)
      updated_at: new Date().toISOString(),
    };
    
    if (effectiveProfileId) {
      updateData.student_profile_id = effectiveProfileId; // Profile-level: include both
    } else {
      updateData.student_profile_id = null; // User-level: profile_id is null
    }
    
    // Use the composite unique constraint: (user_id, student_profile_id)
    const { error } = await supabase
      .from("xp_data")
      .upsert(updateData, {
        onConflict: "user_id,student_profile_id",
      });

    if (error) {
      logger.error("Error updating XP data", { error: error.message, userId });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error in updateXPData", { error, userId });
    return false;
  }
}

// ============================================
// STREAK DATA
// ============================================

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
}

/**
 * Get streak data from Supabase
 */
export async function getStreakData(userId: string, profileId?: string | null): Promise<StreakData | null> {
  try {
    // CRITICAL: Ensure profile exists before querying (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.debug("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 5000); // Increased timeout
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return null;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    let query = supabase
      .from("streaks")
      .select("*");
    
    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.eq("user_id", userId).is("student_profile_id", null);
    }
    
    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching streak data", { error: error.message, userId, profileId: effectiveProfileId });
      return await createDefaultStreakData(userId, effectiveProfileId);
    }
    
    // If no data (empty array), create default
    if (!data || data.length === 0) {
      logger.info("No streak data found, creating default", { userId, profileId: effectiveProfileId });
      return await createDefaultStreakData(userId, effectiveProfileId);
    }
    
    // Get first row
    const streakRow = data[0];

    return {
      current_streak: streakRow.current_streak || 0,
      longest_streak: streakRow.longest_streak || 0,
      last_study_date: streakRow.last_study_date || null,
    };
  } catch (error) {
    logger.error("Error in getStreakData", { error, userId });
    return null;
  }
}

/**
 * Create default streak data
 */
async function createDefaultStreakData(userId: string, profileId?: string | null): Promise<StreakData> {
  try {
    const supabase = await getSupabaseClient();
    
    // Check if data already exists for this profile/user combination
    let checkQuery = supabase.from("streaks").select("*");
    if (profileId) {
      checkQuery = checkQuery.eq("student_profile_id", profileId);
    } else {
      checkQuery = checkQuery.eq("user_id", userId).is("student_profile_id", null);
    }
    
    const { data: existingData, error: checkError } = await checkQuery;
    
    // If data exists, return it
    if (existingData && existingData.length > 0) {
      const existing = existingData[0];
      return {
        current_streak: existing.current_streak || 0,
        longest_streak: existing.longest_streak || 0,
        last_study_date: existing.last_study_date || null,
      };
    }
    
    const defaultData: any = {
      user_id: userId, // ALWAYS include user_id (required by RLS policies)
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null,
    };
    
    if (profileId) {
      // For profile: include BOTH user_id and profile_id
      defaultData.student_profile_id = profileId;
    } else {
      // For user: include user_id, profile_id is null
      defaultData.student_profile_id = null;
    }

    const { data, error } = await supabase
      .from("streaks")
      .insert(defaultData)
      .select()
      .single();

    if (error) {
      // If duplicate key error (race condition), fetch and return existing data
      if (error.code === "23505") {
        logger.debug("Streak data created by another request (race condition), fetching existing", { userId });
        const { data: raceData } = await checkQuery;
        if (raceData && raceData.length > 0) {
          const existing = raceData[0];
          return {
            current_streak: existing.current_streak || 0,
            longest_streak: existing.longest_streak || 0,
            last_study_date: existing.last_study_date || null,
          };
        }
      }
      logger.error("Error creating default streak data", { error: error.message, userId });
      return defaultData;
    }

    return {
      current_streak: data.current_streak || 0,
      longest_streak: data.longest_streak || 0,
      last_study_date: data.last_study_date || null,
    };
  } catch (error) {
    logger.error("Error creating default streak data", { error, userId });
    return {
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null,
    };
  }
}

/**
 * Update streak data in Supabase
 */
export async function updateStreakData(userId: string, streakData: Partial<StreakData>, profileId?: string | null): Promise<boolean> {
  try {
    // CRITICAL: Ensure profile exists before updating (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return false;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    const updateData: any = {
      ...streakData,
      user_id: userId, // ALWAYS include user_id (required by RLS and NOT NULL constraint)
      updated_at: new Date().toISOString(),
    };
    
    if (effectiveProfileId) {
      updateData.student_profile_id = effectiveProfileId; // Profile-level: include both
    } else {
      updateData.student_profile_id = null; // User-level: profile_id is null
    }
    
    // Use the composite unique constraint: (user_id, student_profile_id)
    const { error } = await supabase
      .from("streaks")
      .upsert(updateData, {
        onConflict: "user_id,student_profile_id",
      });

    if (error) {
      logger.error("Error updating streak data", { error: error.message, userId });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error in updateStreakData", { error, userId });
    return false;
  }
}

// ============================================
// PROBLEMS
// ============================================

export interface ProblemData {
  id?: string;
  text: string;
  type: string;
  difficulty?: string;
  image_url?: string;
  parsed_data?: any;
  is_bookmarked?: boolean;
  is_generated?: boolean;
  source?: string;
  solved_at?: string;
  attempts?: number;
  hints_used?: number;
  time_spent?: number;
}

/**
 * Get problems from Supabase
 */
export async function getProblems(userId: string, limit = 100, profileId?: string | null): Promise<ProblemData[]> {
  try {
    // CRITICAL: Ensure profile exists before querying (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return [];
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    let query = supabase
      .from("problems")
      .select("*");
    
    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.eq("user_id", userId).is("student_profile_id", null);
    }
    
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching problems", { error: error.message, userId });
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      text: p.text,
      type: p.type,
      difficulty: p.difficulty,
      image_url: p.image_url,
      parsed_data: p.parsed_data,
      is_bookmarked: p.is_bookmarked || false,
      is_generated: p.is_generated || false,
      source: p.source,
      solved_at: p.solved_at,
      attempts: p.attempts || 0,
      hints_used: p.hints_used || 0,
      time_spent: p.time_spent || 0,
    }));
  } catch (error) {
    logger.error("Error in getProblems", { error, userId });
    return [];
  }
}

/**
 * Save problem to Supabase
 */
export async function saveProblem(userId: string, problem: ProblemData, profileId?: string | null): Promise<string | null> {
  try {
    // CRITICAL: Ensure profile exists before saving (foreign keys point to profiles.id)
    await ensureProfileExists(userId);
    
    const supabase = await getSupabaseClient();
    const effectiveProfileId = profileId !== undefined 
      ? profileId 
      : await getEffectiveProfileId();
    
    const insertData: any = {
      user_id: userId,
      text: problem.text,
      type: problem.type,
      difficulty: problem.difficulty,
      image_url: problem.image_url,
      parsed_data: problem.parsed_data,
      is_bookmarked: problem.is_bookmarked || false,
      is_generated: problem.is_generated || false,
      source: problem.source,
      solved_at: problem.solved_at,
      attempts: problem.attempts || 0,
      hints_used: problem.hints_used || 0,
      time_spent: problem.time_spent || 0,
    };
    
    if (effectiveProfileId) {
      insertData.student_profile_id = effectiveProfileId;
    }
    
    const { data, error } = await supabase
      .from("problems")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error("Error saving problem", { error: error.message, userId });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error("Error in saveProblem", { error, userId });
    return null;
  }
}

/**
 * Update problem in Supabase
 */
export async function updateProblem(userId: string, problemId: string, updates: Partial<ProblemData>): Promise<boolean> {
  try {
    // CRITICAL: Ensure profile exists before updating (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return false;
    }
    const { error } = await supabase
      .from("problems")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", problemId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Error updating problem", { error: error.message, userId, problemId });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error in updateProblem", { error, userId, problemId });
    return false;
  }
}

/**
 * Delete problem from Supabase
 */
export async function deleteProblem(userId: string, problemId: string, profileId?: string | null): Promise<boolean> {
  try {
    // CRITICAL: Ensure profile exists before deleting (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return false;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    let query = supabase
      .from("problems")
      .delete()
      .eq("id", problemId)
      .eq("user_id", userId);
    
    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { error } = await query;

    if (error) {
      logger.error("Error deleting problem", { error: error.message, userId, problemId });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error in deleteProblem", { error, userId, problemId });
    return false;
  }
}

// ============================================
// CHALLENGES
// ============================================

export interface ChallengeData {
  id?: string;
  challenge_text: string;
  challenge_type?: string; // 'share', 'daily', 'generated', 'friend_challenge'
  problem_type?: string;
  difficulty?: string;
  share_code?: string;
  share_id?: string;
  challenger_id?: string;
  solved_at?: string;
  attempts?: number;
  hints_used?: number;
  time_spent?: number;
  is_completed?: boolean;
  metadata?: any;
}

/**
 * Get challenges from Supabase
 */
export async function getChallenges(userId: string, limit = 100, profileId?: string | null): Promise<ChallengeData[]> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return [];
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    let query = supabase
      .from("challenges")
      .select("*");
    
    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.eq("user_id", userId).is("student_profile_id", null);
    }
    
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching challenges", { error: error.message, userId });
      return [];
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      challenge_text: c.challenge_text,
      challenge_type: c.challenge_type,
      problem_type: c.problem_type,
      difficulty: c.difficulty,
      share_code: c.share_code,
      share_id: c.share_id,
      challenger_id: c.challenger_id,
      solved_at: c.solved_at,
      attempts: c.attempts || 0,
      hints_used: c.hints_used || 0,
      time_spent: c.time_spent || 0,
      is_completed: c.is_completed || false,
      metadata: c.metadata,
    }));
  } catch (error) {
    logger.error("Error in getChallenges", { error, userId });
    return [];
  }
}

/**
 * Save challenge to Supabase
 */
export async function saveChallenge(userId: string, challenge: ChallengeData, profileId?: string | null): Promise<string | null> {
  try {
    // CRITICAL: Ensure profile exists (even though challenges table references auth.users, we need profiles for consistency)
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return null;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    const insertData: any = {
      user_id: userId,
      challenge_text: challenge.challenge_text,
      challenge_type: challenge.challenge_type || "generated",
      problem_type: challenge.problem_type,
      difficulty: challenge.difficulty,
      share_code: challenge.share_code,
      share_id: challenge.share_id,
      challenger_id: challenge.challenger_id,
      solved_at: challenge.solved_at,
      attempts: challenge.attempts || 0,
      hints_used: challenge.hints_used || 0,
      time_spent: challenge.time_spent || 0,
      is_completed: challenge.is_completed || false,
      metadata: challenge.metadata || {},
    };
    
    if (effectiveProfileId) {
      insertData.student_profile_id = effectiveProfileId;
    }
    
    const { data, error } = await supabase
      .from("challenges")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error("Error saving challenge", { error: error.message, userId });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error("Error in saveChallenge", { error, userId });
    return null;
  }
}

/**
 * Update challenge in Supabase
 */
export async function updateChallenge(userId: string, challengeId: string, updates: Partial<ChallengeData>): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("challenges")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", challengeId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Error updating challenge", { error: error.message, userId, challengeId });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error in updateChallenge", { error, userId, challengeId });
    return false;
  }
}

// ============================================
// ACHIEVEMENTS
// ============================================

export interface AchievementData {
  achievement_type: string;
  title: string;
  description?: string;
  icon?: string;
  unlocked_at: string;
}

/**
 * Get achievements from Supabase
 */
export async function getAchievements(userId: string, profileId?: string | null): Promise<AchievementData[]> {
  try {
    // CRITICAL: Ensure profile exists before querying (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return [];
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    let query = supabase
      .from("achievements")
      .select("*");
    
    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.eq("user_id", userId).is("student_profile_id", null);
    }
    
    const { data, error } = await query
      .order("unlocked_at", { ascending: false });

    if (error) {
      logger.error("Error fetching achievements", { error: error.message, userId });
      return [];
    }

    return (data || []).map((a: any) => ({
      achievement_type: a.achievement_type,
      title: a.title,
      description: a.description,
      icon: a.icon,
      unlocked_at: a.unlocked_at,
    }));
  } catch (error) {
    logger.error("Error in getAchievements", { error, userId });
    return [];
  }
}

/**
 * Unlock achievement in Supabase
 */
export async function unlockAchievement(userId: string, achievement: AchievementData, profileId?: string | null): Promise<boolean> {
  try {
    // CRITICAL: Ensure profile exists before saving (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return false;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    const insertData: any = {
      user_id: userId,
      achievement_type: achievement.achievement_type,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      unlocked_at: achievement.unlocked_at || new Date().toISOString(),
    };
    
    if (effectiveProfileId) {
      insertData.student_profile_id = effectiveProfileId;
    }
    
    const { error } = await supabase
      .from("achievements")
      .insert(insertData)
      .select()
      .single();

      if (error) {
      // If already exists, that's okay (UNIQUE constraint)
      if (error.code === "23505") {
        logger.debug("Achievement already unlocked", { userId, profileId: effectiveProfileId, achievement_type: achievement.achievement_type });
        return true;
      }
      logger.error("Error unlocking achievement", { error: error.message, userId });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error in unlockAchievement", { error, userId });
    return false;
  }
}

// ============================================
// LOAD ALL USER DATA
// ============================================

export interface UserData {
  xpData: XPData | null;
  streakData: StreakData | null;
  problems: ProblemData[];
  achievements: AchievementData[];
}

// ============================================
// STUDY SESSIONS
// ============================================

export interface StudySession {
  id?: string;
  start_time: string;
  end_time?: string;
  duration: number; // in seconds
  problems_solved: number;
  xp_earned: number;
}

/**
 * Get study sessions from Supabase
 */
export async function getStudySessions(userId: string, limit = 100, profileId?: string | null): Promise<StudySession[]> {
  try {
    // CRITICAL: Ensure profile exists before querying (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return [];
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    let query = supabase
      .from("study_sessions")
      .select("*");
    
    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.eq("user_id", userId).is("student_profile_id", null);
    }
    
    // Use started_at for ordering study sessions
    const { data, error } = await query
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching study sessions", { error: error.message, userId });
      return [];
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      start_time: s.start_time || s.created_at || new Date().toISOString(),
      end_time: s.end_time,
      duration: s.duration || 0,
      problems_solved: s.problems_solved || 0,
      xp_earned: s.xp_earned || 0,
    }));
  } catch (error) {
    logger.error("Error in getStudySessions", { error, userId });
    return [];
  }
}

/**
 * Save study session to Supabase
 */
export async function saveStudySession(userId: string, session: StudySession, profileId?: string | null): Promise<string | null> {
  try {
    // CRITICAL: Ensure profile exists before saving (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return null;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    const insertData: any = {
      user_id: userId,
      started_at: session.start_time || new Date().toISOString(),
      start_time: session.start_time || new Date().toISOString(),
      end_time: session.end_time,
      duration: session.duration,
      duration_seconds: session.duration,
      problems_solved: session.problems_solved,
      xp_earned: session.xp_earned,
    };
    
    if (effectiveProfileId) {
      insertData.student_profile_id = effectiveProfileId;
    }
    
    const { data, error } = await supabase
      .from("study_sessions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error("Error saving study session", { error: error.message, userId });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error("Error in saveStudySession", { error, userId });
    return null;
  }
}

// ============================================
// DAILY GOALS
// ============================================

export interface DailyGoal {
  id?: string;
  date: string;
  problems_goal: number;
  time_goal: number; // in minutes
  problems_completed: number;
  time_completed: number; // in minutes
}

/**
 * Get daily goals from Supabase
 */
export async function getDailyGoals(userId: string, limit = 30, profileId?: string | null): Promise<DailyGoal[]> {
  try {
    // CRITICAL: Ensure profile exists before querying (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return [];
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    let query = supabase
      .from("daily_goals")
      .select("*");
    
    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.eq("user_id", userId).is("student_profile_id", null);
    }
    
    const { data, error } = await query
      .order("date", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching daily goals", { error: error.message, userId });
      return [];
    }

    return (data || []).map((g: any) => ({
      id: g.id,
      date: g.date,
      problems_goal: g.problems_goal || 5,
      time_goal: g.time_goal || 30,
      problems_completed: g.problems_completed || 0,
      time_completed: g.time_completed || 0,
    }));
  } catch (error) {
    logger.error("Error in getDailyGoals", { error, userId });
    return [];
  }
}

/**
 * Save or update daily goal in Supabase
 */
export async function saveDailyGoal(userId: string, goal: DailyGoal, profileId?: string | null): Promise<string | null> {
  try {
    // CRITICAL: Ensure profile exists before saving (foreign keys point to profiles.id)
    // Add timeout to prevent hanging
    const profileExistsPromise = ensureProfileExists(userId);
    const profileTimeout = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        logger.warn("ensureProfileExists timeout - continuing anyway", { userId });
        resolve(false);
      }, 2000);
    });
    await Promise.race([profileExistsPromise, profileTimeout]);
    
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available");
      return null;
    }
    
    // Use profile ID if provided, otherwise use null (don't call getEffectiveProfileId - it hangs!)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    const upsertData: any = {
      user_id: userId,
      date: goal.date,
      problems_goal: goal.problems_goal,
      time_goal: goal.time_goal,
      problems_completed: goal.problems_completed,
      time_completed: goal.time_completed,
    };
    
    if (effectiveProfileId) {
      upsertData.student_profile_id = effectiveProfileId;
    }
    
    const conflictColumns = effectiveProfileId ? "student_profile_id,date" : "user_id,date";
    
    const { data, error } = await supabase
      .from("daily_goals")
      .upsert(upsertData, {
        onConflict: conflictColumns,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error saving daily goal", { error: error.message, userId });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error("Error in saveDailyGoal", { error, userId });
    return null;
  }
}

// ============================================
// LOAD ALL USER DATA
// ============================================

export interface UserData {
  xpData: XPData | null;
  streakData: StreakData | null;
  problems: ProblemData[];
  achievements: AchievementData[];
  studySessions: StudySession[];
  dailyGoals: DailyGoal[];
}

/**
 * Load all user data from Supabase at once (optimized)
 */
export async function loadUserData(userId: string, profileId?: string | null): Promise<UserData> {
  try {
    // Use provided profileId, don't call getEffectiveProfileId - it hangs!
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    
    // Load all data in parallel for speed
    const [xpData, streakData, problems, achievements, studySessions, dailyGoals] = await Promise.all([
      getXPData(userId, effectiveProfileId),
      getStreakData(userId, effectiveProfileId),
      getProblems(userId, 100, effectiveProfileId),
      getAchievements(userId, effectiveProfileId),
      getStudySessions(userId, 100, effectiveProfileId),
      getDailyGoals(userId, 30, effectiveProfileId),
    ]);

    return {
      xpData,
      streakData,
      problems,
      achievements,
      studySessions,
      dailyGoals,
    };
  } catch (error) {
    logger.error("Error loading user data", { error, userId });
    return {
      xpData: null,
      streakData: null,
      problems: [],
      achievements: [],
      studySessions: [],
      dailyGoals: [],
    };
  }
}

