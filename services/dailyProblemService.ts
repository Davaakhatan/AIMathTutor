/**
 * Daily Problem Service
 * Handles storing and retrieving daily problems and completion status in database
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEffectiveProfileId } from "@/services/studentProfileService";
import { logger } from "@/lib/logger";
import { ParsedProblem, ProblemType } from "@/types";

export interface DailyProblemData {
  problem: ParsedProblem;
  date: string; // YYYY-MM-DD format
  difficulty: "elementary" | "middle school" | "high school" | "advanced";
  topic: string;
}

/**
 * Check if today's daily problem has been solved
 */
export async function isDailyProblemSolved(
  userId: string,
  problemDate: string, // YYYY-MM-DD format
  profileId?: string | null
): Promise<boolean> {
  try {
    logger.debug("isDailyProblemSolved called", { userId, problemDate, profileId });
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.warn("Supabase admin client not available");
      return false;
    }

    // Use provided profileId or null (don't call getEffectiveProfileId to avoid hanging)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    logger.debug("Using profileId for completion check", { effectiveProfileId });

    let query = supabase
      .from("daily_problems_completion")
      .select("id")
      .eq("user_id", userId)
      .eq("problem_date", problemDate);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    // Use maybeSingle() instead of single() to avoid hanging when no result
    // maybeSingle() returns null instead of error when no row found
    logger.debug("Executing database query", { userId, problemDate, effectiveProfileId });
    
    try {
      // Add explicit timeout wrapper
      const queryPromise = query.maybeSingle();
      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) => {
        setTimeout(() => {
          logger.warn("Query timeout - returning no result", { userId, problemDate });
          resolve({ data: null, error: { message: "Query timeout", code: "TIMEOUT" } });
        }, 2000); // 2 second timeout
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const { data, error } = result;

      if (error) {
        if (error.code === "TIMEOUT") {
          logger.warn("Query timed out after 2 seconds", { userId, problemDate });
          return false;
        }
        logger.error("Error checking daily problem completion", { 
          error: error.message, 
          errorCode: error.code, 
          errorDetails: error,
          userId, 
          problemDate 
        });
        return false;
      }

      const isSolved = !!data;
      logger.debug("Completion check result", { userId, problemDate, isSolved, hasData: !!data, dataId: data?.id });
      return isSolved;
    } catch (err) {
      logger.error("Exception in isDailyProblemSolved query", { error: err, userId, problemDate });
      return false;
    }
  } catch (error) {
    logger.error("Error in isDailyProblemSolved", { error, userId, problemDate });
    return false;
  }
}

/**
 * Mark daily problem as solved
 */
export async function markDailyProblemSolved(
  userId: string,
  problemDate: string, // YYYY-MM-DD format
  problemText: string,
  profileId?: string | null
): Promise<boolean> {
  try {
    logger.debug("markDailyProblemSolved called", { userId, problemDate, profileId, problemTextLength: problemText.length });
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.warn("Supabase admin client not available");
      return false;
    }

    // Use provided profileId or null (don't call getEffectiveProfileId to avoid hanging)
    const effectiveProfileId = profileId !== undefined ? profileId : null;
    logger.debug("Using profileId for saving completion", { effectiveProfileId });

    const insertData: any = {
      user_id: userId,
      problem_date: problemDate,
      problem_text: problemText,
      solved_at: new Date().toISOString(),
    };

    if (effectiveProfileId) {
      insertData.student_profile_id = effectiveProfileId;
    } else {
      insertData.student_profile_id = null;
    }

    logger.debug("Inserting completion data", { insertData: { ...insertData, problem_text: insertData.problem_text.substring(0, 50) + "..." } });

    // Use upsert to handle case where completion already exists
    // The unique index handles NULL profile_id properly via COALESCE
    const { data, error } = await supabase
      .from("daily_problems_completion")
      .upsert(insertData, {
        onConflict: "user_id,student_profile_id,problem_date",
        ignoreDuplicates: false, // Update if exists
      })
      .select();

    if (error) {
      logger.error("Error marking daily problem as solved", { 
        error: error.message, 
        errorCode: error.code,
        errorDetails: error,
        userId, 
        problemDate,
        profileId: effectiveProfileId 
      });
      return false;
    }

    logger.info("Daily problem marked as solved successfully", { 
      userId, 
      problemDate, 
      profileId: effectiveProfileId,
      data 
    });
    return true;
  } catch (error) {
    logger.error("Error in markDailyProblemSolved", { error, userId, problemDate });
    return false;
  }
}

/**
 * Get today's daily problem from database
 */
export async function getDailyProblem(problemDate: string): Promise<DailyProblemData | null> {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        logger.warn("getDailyProblem timeout after 5 seconds", { problemDate });
        resolve(null);
      }, 5000);
    });

    const dbQuery = async (): Promise<DailyProblemData | null> => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        logger.warn("Supabase admin client not available");
        return null;
      }

      const { data, error } = await supabase
        .from("daily_problems")
        .select("*")
        .eq("problem_date", problemDate)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No problem found for this date
          logger.debug("No daily problem found in database", { problemDate });
          return null;
        }
        logger.error("Error fetching daily problem", { error: error.message, problemDate });
        return null;
      }

      if (!data) {
        return null;
      }

      logger.debug("Daily problem found in database", { problemDate });
      return {
        problem: {
          text: data.problem_text,
          type: data.problem_type as ProblemType,
          confidence: 1.0,
        },
        date: data.problem_date,
        difficulty: data.difficulty as "elementary" | "middle school" | "high school" | "advanced",
        topic: data.topic || data.problem_type.replace("_", " "),
      };
    };

    // Race between query and timeout
    return await Promise.race([dbQuery(), timeoutPromise]);
  } catch (error) {
    logger.error("Error in getDailyProblem", { error, problemDate });
    return null;
  }
}

/**
 * Save daily problem to database
 * Note: This should be called by server-side code (API route) with admin privileges
 */
export async function saveDailyProblem(problemData: DailyProblemData): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.warn("Supabase admin client not available");
      return false;
    }

    const { error } = await supabase
      .from("daily_problems")
      .upsert({
        problem_date: problemData.date,
        problem_text: problemData.problem.text,
        problem_type: problemData.problem.type || "UNKNOWN",
        difficulty: problemData.difficulty,
        topic: problemData.topic,
      }, {
        onConflict: "problem_date",
        ignoreDuplicates: false,
      });

    if (error) {
      logger.error("Error saving daily problem", { error: error.message, date: problemData.date });
      return false;
    }

    logger.debug("Daily problem saved to database", { date: problemData.date });
    return true;
  } catch (error) {
    logger.error("Error in saveDailyProblem", { error, date: problemData.date });
    return false;
  }
}

