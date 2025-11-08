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
  // Check cache first - avoid redundant database calls
  if (isProfileCached(userId)) {
    return true;
  }

  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available, cannot ensure profile exists");
      return false;
    }

    // Check if profile exists
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // Error other than "not found"
      logger.error("Error checking profile existence", { error: error.message, userId });
      return false;
    }

    if (!data) {
      // Profile doesn't exist, create it
      // Try to get role from user metadata first
      let userRole: "student" | "parent" | "teacher" | "admin" = "student";
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.role) {
          const metadataRole = user.user_metadata.role;
          if (["student", "parent", "teacher", "admin"].includes(metadataRole)) {
            userRole = metadataRole as any;
            logger.debug("Using role from user metadata", { userId, role: userRole });
          }
        }
      } catch (e) {
        // If we can't get user metadata, default to student
        logger.debug("Could not get user metadata, defaulting to student", { userId });
      }
      
      logger.info("Creating missing profile for user", { userId, role: userRole });
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          role: userRole,
        } as any);

      if (insertError) {
        // If duplicate key error, profile was created between check and insert (race condition)
        if (insertError.code === "23505") {
          logger.debug("Profile already exists (race condition)", { userId });
          cacheProfileExists(userId); // Cache it
          return true;
        }
        logger.error("Error creating profile", { error: insertError.message, userId });
        return false;
      }

      logger.info("Profile created successfully", { userId });
    }

    // Cache the result to avoid redundant checks
    cacheProfileExists(userId);
    return true;
  } catch (error) {
    logger.error("Exception in ensureProfileExists", { error, userId });
    return false;
  }
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
    
    // Get first row
    const xpRow = data[0];

    return {
      total_xp: xpRow.total_xp || 0,
      level: xpRow.level || 1,
      xp_to_next_level: xpRow.xp_to_next_level || 100,
      xp_history: (xpRow.xp_history as any) || [],
      recent_gains: (xpRow.recent_gains as any) || [],
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

