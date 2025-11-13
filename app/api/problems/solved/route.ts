import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * GET /api/problems/solved
 * Fetch solved problems for the current user
 * Includes:
 * 1. Problems from problems table where solved_at is not null
 * 2. Problem of the Day completions from daily_problems_completion
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.debug("Fetching solved problems via API", { userId, effectiveProfileId, limit });

    // 1. Get solved problems from problems table
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
      logger.error("Error fetching solved problems", {
        error: problemsError.message,
        userId,
        effectiveProfileId,
      });
    }

    // 2. Get Problem of the Day completions
    let dailyProblemsQuery = supabase
      .from("daily_problems_completion")
      .select(`
        *,
        daily_problems (
          problem_text,
          problem_type,
          difficulty
        )
      `)
      .eq("user_id", userId)
      .eq("is_solved", true);

    if (effectiveProfileId) {
      dailyProblemsQuery = dailyProblemsQuery.eq("student_profile_id", effectiveProfileId);
    } else {
      dailyProblemsQuery = dailyProblemsQuery.is("student_profile_id", null);
    }

    const { data: dailyCompletions, error: dailyError } = await dailyProblemsQuery
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (dailyError) {
      logger.error("Error fetching daily problem completions", {
        error: dailyError.message,
        userId,
        effectiveProfileId,
      });
    }

    // Combine and format results
    const allSolved: any[] = [];

    // Add solved problems from problems table
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

    // Add Problem of the Day completions
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

    // Sort by solved_at (most recent first)
    allSolved.sort((a, b) => {
      const aTime = new Date(a.solved_at).getTime();
      const bTime = new Date(b.solved_at).getTime();
      return bTime - aTime;
    });

    // Limit results
    const limited = allSolved.slice(0, limit);

    logger.debug("Solved problems fetched via API", {
      count: limited.length,
      problemsCount: solvedProblems?.length || 0,
      dailyCount: dailyCompletions?.length || 0,
      userId,
      effectiveProfileId,
    });

    return NextResponse.json({ success: true, problems: limited });
  } catch (error) {
    logger.error("Exception fetching solved problems via API", { error });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

