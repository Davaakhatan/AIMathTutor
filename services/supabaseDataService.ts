/**
 * Supabase Data Service
 * Handles all data operations for authenticated users
 * Supabase is the source of truth, localStorage is cache only
 */

import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

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
 * Get XP data from Supabase for authenticated user
 */
export async function getXPData(userId: string): Promise<XPData | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("xp_data")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No XP data yet - create default
        return await createDefaultXPData(userId);
      }
      logger.error("Error fetching XP data", { error: error.message, userId });
      return null;
    }

    return {
      total_xp: data.total_xp || 0,
      level: data.level || 1,
      xp_to_next_level: data.xp_to_next_level || 100,
      xp_history: (data.xp_history as any) || [],
      recent_gains: (data.recent_gains as any) || [],
    };
  } catch (error) {
    logger.error("Error in getXPData", { error, userId });
    return null;
  }
}

/**
 * Create default XP data for new user
 */
async function createDefaultXPData(userId: string): Promise<XPData> {
  try {
    const supabase = await getSupabaseClient();
    const defaultData = {
      user_id: userId,
      total_xp: 0,
      level: 1,
      xp_to_next_level: 100,
      xp_history: [],
      recent_gains: [],
    };

    const { data, error } = await supabase
      .from("xp_data")
      .insert(defaultData)
      .select()
      .single();

    if (error) {
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
export async function updateXPData(userId: string, xpData: Partial<XPData>): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("xp_data")
      .upsert({
        user_id: userId,
        ...xpData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
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
export async function getStreakData(userId: string): Promise<StreakData | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No streak data yet - create default
        return await createDefaultStreakData(userId);
      }
      logger.error("Error fetching streak data", { error: error.message, userId });
      return null;
    }

    return {
      current_streak: data.current_streak || 0,
      longest_streak: data.longest_streak || 0,
      last_study_date: data.last_study_date || null,
    };
  } catch (error) {
    logger.error("Error in getStreakData", { error, userId });
    return null;
  }
}

/**
 * Create default streak data
 */
async function createDefaultStreakData(userId: string): Promise<StreakData> {
  try {
    const supabase = await getSupabaseClient();
    const defaultData = {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null,
    };

    const { data, error } = await supabase
      .from("streaks")
      .insert(defaultData)
      .select()
      .single();

    if (error) {
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
export async function updateStreakData(userId: string, streakData: Partial<StreakData>): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("streaks")
      .upsert({
        user_id: userId,
        ...streakData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
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
export async function getProblems(userId: string, limit = 100): Promise<ProblemData[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("problems")
      .select("*")
      .eq("user_id", userId)
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
export async function saveProblem(userId: string, problem: ProblemData): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("problems")
      .insert({
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
      })
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
    const supabase = await getSupabaseClient();
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
export async function getAchievements(userId: string): Promise<AchievementData[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", userId)
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
export async function unlockAchievement(userId: string, achievement: AchievementData): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("achievements")
      .insert({
        user_id: userId,
        achievement_type: achievement.achievement_type,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        unlocked_at: achievement.unlocked_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // If already exists, that's okay (UNIQUE constraint)
      if (error.code === "23505") {
        logger.debug("Achievement already unlocked", { userId, achievement_type: achievement.achievement_type });
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
export async function getStudySessions(userId: string, limit = 100): Promise<StudySession[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching study sessions", { error: error.message, userId });
      return [];
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      start_time: s.start_time,
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
export async function saveStudySession(userId: string, session: StudySession): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        start_time: session.start_time,
        end_time: session.end_time,
        duration: session.duration,
        problems_solved: session.problems_solved,
        xp_earned: session.xp_earned,
      })
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
export async function getDailyGoals(userId: string, limit = 30): Promise<DailyGoal[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("daily_goals")
      .select("*")
      .eq("user_id", userId)
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
export async function saveDailyGoal(userId: string, goal: DailyGoal): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("daily_goals")
      .upsert({
        user_id: userId,
        date: goal.date,
        problems_goal: goal.problems_goal,
        time_goal: goal.time_goal,
        problems_completed: goal.problems_completed,
        time_completed: goal.time_completed,
      }, {
        onConflict: "user_id,date",
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
export async function loadUserData(userId: string): Promise<UserData> {
  try {
    // Load all data in parallel for speed
    const [xpData, streakData, problems, achievements, studySessions, dailyGoals] = await Promise.all([
      getXPData(userId),
      getStreakData(userId),
      getProblems(userId),
      getAchievements(userId),
      getStudySessions(userId),
      getDailyGoals(userId),
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

