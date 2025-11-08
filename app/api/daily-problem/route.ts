/**
 * API route for daily problems
 * Handles saving and fetching daily problems to/from database (server-side only)
 */

import { NextRequest, NextResponse } from "next/server";
import { saveDailyProblem } from "@/services/dailyProblemService";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { ProblemType } from "@/types";

// Note: GET is now used for completion status check
// To fetch the problem itself, we'll need a different endpoint or use POST with action parameter

// GET completion status: Check if daily problem is solved
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    logger.debug("Checking completion status via API", { date, userId, profileId });
    
    try {
      const supabase = getSupabaseServer();
      
      // Build query with timeout protection
      let query = supabase
        .from("daily_problems_completion")
        .select("id")
        .eq("user_id", userId)
        .eq("problem_date", date);

      if (profileId && profileId !== "null") {
        query = query.eq("student_profile_id", profileId);
      } else {
        query = query.is("student_profile_id", null);
      }

      // Add timeout wrapper
      const queryPromise = query.maybeSingle();
      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) => {
        setTimeout(() => {
          logger.warn("Completion check query timeout", { date, userId });
          resolve({ data: null, error: { message: "Query timeout", code: "TIMEOUT" } });
        }, 3000);
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const { data, error } = result;

      if (error) {
        if (error.code === "TIMEOUT") {
          logger.warn("Completion check timed out", { date, userId });
          return NextResponse.json({ success: false, isSolved: false, timeout: true });
        }
        logger.error("Error checking completion", { error: error.message, errorCode: error.code, date, userId });
        return NextResponse.json({ success: false, isSolved: false });
      }

      const isSolved = !!data;
      logger.debug("Completion check result", { date, userId, isSolved, hasData: !!data });
      return NextResponse.json({ success: true, isSolved });
    } catch (err) {
      logger.error("Exception in completion check", { error: err, date, userId });
      return NextResponse.json({ success: false, isSolved: false });
    }
  } catch (error) {
    logger.error("Error in GET completion check", { error });
    return NextResponse.json(
      { success: false, isSolved: false },
      { status: 500 }
    );
  }
}

// POST: Save daily problem OR mark as solved
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, date, problem, difficulty, topic, userId, profileId, problemText } = body;

    // Handle marking as solved
    if (action === "markSolved") {
      if (!date || !userId || !problemText) {
        return NextResponse.json(
          { success: false, error: "Missing required fields for markSolved" },
          { status: 400 }
        );
      }

      logger.debug("Marking daily problem as solved via API", { date, userId, profileId, problemTextLength: problemText?.length });
      
      try {
        const supabase = getSupabaseServer();
        
        // First, check if record exists
        let checkQuery = supabase
          .from("daily_problems_completion")
          .select("id")
          .eq("user_id", userId)
          .eq("problem_date", date);

        if (profileId && profileId !== "null") {
          checkQuery = checkQuery.eq("student_profile_id", profileId);
        } else {
          checkQuery = checkQuery.is("student_profile_id", null);
        }

        const { data: existing, error: checkError } = await checkQuery.maybeSingle();

        let result: any;
        if (existing && (existing as any).id) {
          // Update existing record
          logger.debug("Updating existing completion", { id: (existing as any).id });
          result = await (supabase as any)
            .from("daily_problems_completion")
            .update({
              problem_text: problemText,
              solved_at: new Date().toISOString(),
            })
            .eq("id", (existing as any).id)
            .select();
        } else {
          // Insert new record
          logger.debug("Inserting new completion");
          const insertData: any = {
            user_id: userId,
            problem_date: date,
            problem_text: problemText,
            solved_at: new Date().toISOString(),
          };

          if (profileId && profileId !== "null") {
            insertData.student_profile_id = profileId;
          } else {
            insertData.student_profile_id = null;
          }

          result = await (supabase as any)
            .from("daily_problems_completion")
            .insert(insertData)
            .select();
        }

        const { data, error } = result as { data: any; error: any };

        if (error) {
          logger.error("Error marking daily problem as solved", { 
            error: error?.message || String(error), 
            errorCode: error?.code,
            errorDetails: JSON.stringify(error),
            errorHint: error?.hint,
            date, 
            userId,
            profileId: profileId && profileId !== "null" ? profileId : null
          });
          return NextResponse.json(
            { success: false, error: error?.message || String(error), errorCode: error?.code },
            { status: 500 }
          );
        }

        logger.info("Daily problem marked as solved successfully", { date, userId, data, recordId: data?.[0]?.id });
        return NextResponse.json({ success: true, data });
      } catch (err) {
        logger.error("Exception marking daily problem as solved", { error: err, date, userId });
        return NextResponse.json(
          { success: false, error: err instanceof Error ? err.message : "Unknown error" },
          { status: 500 }
        );
      }
    }

    // Handle saving daily problem
    if (!date || !problem || !problem.text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    logger.debug("Saving daily problem to database", { date, topic: topic || problem.type });
    const success = await saveDailyProblem({
      date,
      problem,
      difficulty: difficulty || "middle school",
      topic: topic || problem.type?.replace("_", " ") || "Math",
    });

    if (success) {
      logger.info("Daily problem saved successfully", { date });
      return NextResponse.json({ success: true });
    } else {
      logger.error("Failed to save daily problem", { date });
      return NextResponse.json(
        { success: false, error: "Failed to save daily problem" },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error in POST daily-problem API route", { error });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

