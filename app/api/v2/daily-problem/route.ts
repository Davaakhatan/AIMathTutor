/**
 * Daily Problem API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDailyProblem,
  saveDailyProblem,
  checkDailyProblemCompletion,
  markDailyProblemSolved,
  countDailyProblemCompletions
} from "@/backend/services/dailyProblemService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const action = searchParams.get("action");

    // Get daily problem
    if (action === "getProblem") {
      const result = await getDailyProblem(date);
      return NextResponse.json(result);
    }

    // Count completions
    if (action === "countCompletions") {
      if (!userId) {
        return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
      }
      const result = await countDailyProblemCompletions(userId, profileId);
      return NextResponse.json(result);
    }

    // Check completion (default)
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }
    const result = await checkDailyProblemCompletion(userId, date, profileId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/daily-problem", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, date, userId, profileId, problemText, problem, difficulty, topic } = body;

    // Mark as solved
    if (action === "markSolved") {
      if (!date || !userId || !problemText) {
        return NextResponse.json({ success: false, error: "date, userId, and problemText required" }, { status: 400 });
      }
      const result = await markDailyProblemSolved(userId, date, problemText, profileId);
      return NextResponse.json(result);
    }

    // Save daily problem
    if (!date || !problem?.text) {
      return NextResponse.json({ success: false, error: "date and problem.text required" }, { status: 400 });
    }

    const result = await saveDailyProblem({
      date,
      problem,
      difficulty: difficulty || "middle school",
      topic: topic || problem.type?.replace("_", " ") || "Math"
    });
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/daily-problem", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
