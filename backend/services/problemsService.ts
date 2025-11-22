/**
 * Problems Backend Service
 * Handles all problem-related database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { ProblemType } from "@/types";

export interface ProblemData {
  id: string;
  text: string;
  type: ProblemType;
  difficulty: string;
  image_url?: string;
  parsed_data?: any;
  is_bookmarked: boolean;
  is_generated: boolean;
  source: string;
  solved_at?: string;
  created_at: string;
  attempts: number;
  hints_used: number;
  time_spent: number;
}

export interface SaveProblemInput {
  text: string;
  type: ProblemType;
  difficulty: string;
  image_url?: string;
  parsed_data?: any;
  is_bookmarked?: boolean;
  is_generated?: boolean;
  source?: string;
}

/**
 * Get problems for a user
 */
export async function getProblems(
  userId: string,
  profileId: string | null = null,
  limit: number = 100
): Promise<{ success: boolean; problems: ProblemData[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, problems: [], error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.debug("Fetching problems", { userId, effectiveProfileId, limit });

    const { data: allData, error } = await supabase
      .from("problems")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching problems", { error: error.message, userId });
      return { success: false, problems: [], error: error.message };
    }

    // Filter by student_profile_id in memory
    let data = allData;
    if (effectiveProfileId) {
      data = allData?.filter((r: any) => r.student_profile_id === effectiveProfileId) || [];
    } else {
      data = allData?.filter((r: any) => r.student_profile_id === null) || [];
    }

    const problems: ProblemData[] = (data || []).map((p: any) => ({
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
      created_at: p.created_at,
      attempts: p.attempts || 0,
      hints_used: p.hints_used || 0,
      time_spent: p.time_spent || 0,
    }));

    logger.debug("Problems fetched", { count: problems.length, userId });
    return { success: true, problems };
  } catch (error) {
    logger.error("Exception fetching problems", { error, userId });
    return { success: false, problems: [], error: String(error) };
  }
}

/**
 * Get solved problems for a user
 */
export async function getSolvedProblems(
  userId: string,
  profileId: string | null = null,
  limit: number = 100
): Promise<{ success: boolean; problems: any[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, problems: [], error: "Database not configured" };
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    // Get solved problems from problems table
    let problemsQuery = supabase
      .from("problems")
      .select("*")
      .eq("user_id", userId)
      .not("solved_at", "is", null);

    if (effectiveProfileId) {
      problemsQuery = problemsQuery.eq("student_profile_id", effectiveProfileId);
    } else {
      problemsQuery = problemsQuery.is("student_profile_id", null);
    }

    const { data: solvedProblems, error: problemsError } = await problemsQuery
      .order("solved_at", { ascending: false })
      .limit(limit);

    if (problemsError) {
      logger.error("Error fetching solved problems", { error: problemsError.message, userId });
    }

    // Get daily problem completions
    let dailyQuery = supabase
      .from("daily_problems_completion")
      .select(`*, daily_problems (problem_text, problem_type, difficulty)`)
      .eq("user_id", userId)
      .eq("is_solved", true);

    if (effectiveProfileId) {
      dailyQuery = dailyQuery.eq("student_profile_id", effectiveProfileId);
    } else {
      dailyQuery = dailyQuery.is("student_profile_id", null);
    }

    const { data: dailyCompletions, error: dailyError } = await dailyQuery
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (dailyError) {
      logger.error("Error fetching daily completions", { error: dailyError.message, userId });
    }

    // Combine results
    const allSolved: any[] = [];

    if (solvedProblems) {
      solvedProblems.forEach((p: any) => {
        allSolved.push({
          id: p.id,
          text: p.text,
          type: p.type,
          difficulty: p.difficulty,
          image_url: p.image_url,
          parsed_data: p.parsed_data,
          is_bookmarked: p.is_bookmarked || false,
          source: p.source || "user_input",
          solved_at: p.solved_at,
          created_at: p.created_at,
          is_daily_problem: false,
        });
      });
    }

    if (dailyCompletions) {
      dailyCompletions.forEach((dc: any) => {
        const dailyProblem = dc.daily_problems;
        allSolved.push({
          id: `daily-${dc.id}`,
          text: dc.problem_text || dailyProblem?.problem_text || "",
          type: dailyProblem?.problem_type || "word_problem",
          difficulty: dailyProblem?.difficulty || "middle",
          image_url: null,
          parsed_data: {
            text: dc.problem_text || dailyProblem?.problem_text || "",
            type: dailyProblem?.problem_type || "word_problem",
            confidence: 1.0,
          },
          is_bookmarked: false,
          source: "daily_problem",
          solved_at: dc.completed_at,
          created_at: dc.date || dc.completed_at,
          is_daily_problem: true,
        });
      });
    }

    // Sort by solved_at
    allSolved.sort((a, b) => new Date(b.solved_at).getTime() - new Date(a.solved_at).getTime());

    logger.debug("Solved problems fetched", {
      count: allSolved.length,
      problemsCount: solvedProblems?.length || 0,
      dailyCount: dailyCompletions?.length || 0,
      userId
    });

    return { success: true, problems: allSolved.slice(0, limit) };
  } catch (error) {
    logger.error("Exception fetching solved problems", { error, userId });
    return { success: false, problems: [], error: String(error) };
  }
}

/**
 * Save a problem
 */
export async function saveProblem(
  userId: string,
  input: SaveProblemInput,
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
      text: input.text,
      type: input.type,
      difficulty: input.difficulty,
      image_url: input.image_url || null,
      parsed_data: input.parsed_data || null,
      is_bookmarked: input.is_bookmarked || false,
      is_generated: input.is_generated || false,
      source: input.source || "user_input",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("problems")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      logger.error("Error saving problem", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    logger.info("Problem saved", { id: (data as any).id, userId });
    return { success: true, id: (data as any).id };
  } catch (error) {
    logger.error("Exception saving problem", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Update a problem
 */
export async function updateProblem(
  userId: string,
  problemId: string,
  updates: Partial<ProblemData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
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
      logger.error("Error updating problem", { error: error.message, problemId, userId });
      return { success: false, error: error.message };
    }

    logger.debug("Problem updated", { problemId, userId });
    return { success: true };
  } catch (error) {
    logger.error("Exception updating problem", { error, problemId, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Mark problem as solved
 */
export async function markProblemSolved(
  userId: string,
  problemId: string,
  hintsUsed: number = 0,
  timeSpent: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { error } = await supabase
      .from("problems")
      .update({
        solved_at: new Date().toISOString(),
        hints_used: hintsUsed,
        time_spent: timeSpent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", problemId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Error marking problem solved", { error: error.message, problemId, userId });
      return { success: false, error: error.message };
    }

    logger.info("Problem marked as solved", { problemId, userId });
    return { success: true };
  } catch (error) {
    logger.error("Exception marking problem solved", { error, problemId, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Count solved problems for user
 */
export async function countSolvedProblems(
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
      .from("problems")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("solved_at", "is", null);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { count, error } = await query;

    if (error) {
      logger.error("Error counting solved problems", { error: error.message, userId });
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    logger.error("Exception counting solved problems", { error, userId });
    return { success: false, count: 0, error: String(error) };
  }
}
