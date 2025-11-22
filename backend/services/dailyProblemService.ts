/**
 * Daily Problem Backend Service
 * Handles all daily problem database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { ProblemType } from "@/types";
import { awardProblemXP } from "./xpService";

export interface DailyProblemData {
  date: string;
  problem: {
    text: string;
    type: ProblemType;
    confidence: number;
  };
  difficulty: string;
  topic: string;
}

/**
 * Get daily problem by date
 */
export async function getDailyProblem(
  date: string
): Promise<{ success: boolean; problem?: DailyProblemData; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { data, error } = await supabase
      .from("daily_problems")
      .select("*")
      .eq("date", date)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("Error fetching daily problem", { error: error.message, date });
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: true, problem: undefined };
    }

    const row = data as any;
    return {
      success: true,
      problem: {
        date: row.date,
        problem: {
          text: row.problem_text,
          type: row.problem_type || ProblemType.WORD_PROBLEM,
          confidence: 1.0,
        },
        difficulty: row.difficulty || "middle school",
        topic: row.topic || "Math",
      }
    };
  } catch (error) {
    logger.error("Exception fetching daily problem", { error, date });
    return { success: false, error: String(error) };
  }
}

/**
 * Save daily problem
 */
export async function saveDailyProblem(
  problemData: DailyProblemData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { error } = await supabase
      .from("daily_problems")
      .upsert({
        date: problemData.date,
        problem_text: problemData.problem.text,
        problem_type: problemData.problem.type,
        difficulty: problemData.difficulty,
        topic: problemData.topic,
        created_at: new Date().toISOString(),
      }, {
        onConflict: "date"
      });

    if (error) {
      logger.error("Error saving daily problem", { error: error.message, date: problemData.date });
      return { success: false, error: error.message };
    }

    logger.info("Daily problem saved", { date: problemData.date });
    return { success: true };
  } catch (error) {
    logger.error("Exception saving daily problem", { error });
    return { success: false, error: String(error) };
  }
}

/**
 * Check if daily problem is completed
 */
export async function checkDailyProblemCompletion(
  userId: string,
  date: string,
  profileId: string | null = null
): Promise<{ success: boolean; isSolved: boolean; problemText?: string; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, isSolved: false, error: "Database not configured" };
    }

    const { data, error } = await supabase
      .from("daily_problems_completion")
      .select("id, problem_text, user_id")
      .eq("date", date)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error("Error checking completion", { error: error.message, date, userId });
      return { success: true, isSolved: false };
    }

    const isSolved = !!data;
    const dataUserId = (data as any)?.user_id;

    if (data && dataUserId !== userId) {
      logger.error("Completion data user mismatch", { requestedUserId: userId, dataUserId });
      return { success: true, isSolved: false };
    }

    return {
      success: true,
      isSolved,
      problemText: (data as any)?.problem_text || undefined
    };
  } catch (error) {
    logger.error("Exception checking completion", { error, date, userId });
    return { success: true, isSolved: false };
  }
}

/**
 * Mark daily problem as solved
 */
export async function markDailyProblemSolved(
  userId: string,
  date: string,
  problemText: string,
  profileId: string | null = null
): Promise<{
  success: boolean;
  xpAwarded?: {
    xpGained: number;
    newTotalXP: number;
    newLevel: number;
    leveledUp: boolean;
  };
  error?: string;
}> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    // Get daily_problem_id
    const { data: dailyProblemData, error: dailyProblemError } = await supabase
      .from("daily_problems")
      .select("id")
      .eq("date", date)
      .single();

    if (dailyProblemError || !dailyProblemData) {
      logger.error("Daily problem not found", { date, error: dailyProblemError?.message });
      return { success: false, error: "Daily problem not found for this date" };
    }

    // Check if already completed
    let checkQuery = supabase
      .from("daily_problems_completion")
      .select("id")
      .eq("user_id", userId)
      .eq("date", date);

    if (effectiveProfileId) {
      checkQuery = checkQuery.eq("student_profile_id", effectiveProfileId);
    } else {
      checkQuery = checkQuery.is("student_profile_id", null);
    }

    const { data: existing } = await checkQuery.maybeSingle();

    if (existing && (existing as any).id) {
      // Update existing
      const { error } = await (supabase as any)
        .from("daily_problems_completion")
        .update({
          problem_text: problemText,
          completed_at: new Date().toISOString(),
          is_solved: true,
        })
        .eq("id", (existing as any).id);

      if (error) {
        logger.error("Error updating completion", { error: error.message, userId, date });
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const insertData: any = {
        user_id: userId,
        daily_problem_id: (dailyProblemData as any).id,
        date,
        problem_text: problemText,
        completed_at: new Date().toISOString(),
        is_solved: true,
        student_profile_id: effectiveProfileId,
      };

      const { error } = await (supabase as any)
        .from("daily_problems_completion")
        .insert(insertData);

      if (error) {
        logger.error("Error inserting completion", { error: error.message, userId, date });
        return { success: false, error: error.message };
      }
    }

    logger.info("Daily problem marked as solved", { date, userId });

    // Award XP for daily problem (30 XP)
    const xpResult = await awardProblemXP(
      userId,
      ProblemType.WORD_PROBLEM,
      "middle school",
      0,
      effectiveProfileId
    );

    if (xpResult.success) {
      return {
        success: true,
        xpAwarded: {
          xpGained: xpResult.xpGained || 0,
          newTotalXP: xpResult.newTotal || 0,
          newLevel: xpResult.newLevel || 1,
          leveledUp: (xpResult.newLevel || 1) > (xpResult.newLevel || 1)
        }
      };
    }

    return { success: true };
  } catch (error) {
    logger.error("Exception marking daily problem solved", { error, userId, date });
    return { success: false, error: String(error) };
  }
}

/**
 * Count daily problem completions
 */
export async function countDailyProblemCompletions(
  userId: string,
  profileId: string | null = null
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, count: 0, error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    let query = supabase
      .from("daily_problems_completion")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_solved", true);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { count, error } = await query;

    if (error) {
      logger.error("Error counting completions", { error: error.message, userId });
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    logger.error("Exception counting completions", { error, userId });
    return { success: false, count: 0, error: String(error) };
  }
}
