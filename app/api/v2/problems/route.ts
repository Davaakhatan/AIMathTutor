/**
 * Problems API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import { getProblems, saveProblem, updateProblem, markProblemSolved, countSolvedProblems } from "@/backend/services/problemsService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const action = searchParams.get("action");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    if (action === "countSolved") {
      const result = await countSolvedProblems(userId, profileId);
      return NextResponse.json(result);
    }

    const result = await getProblems(userId, profileId, limit);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/problems", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, action, problemId, ...data } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    if (action === "markSolved") {
      if (!problemId) {
        return NextResponse.json({ success: false, error: "problemId required" }, { status: 400 });
      }
      const result = await markProblemSolved(userId, problemId, data.hintsUsed || 0, data.timeSpent || 0);
      return NextResponse.json(result);
    }

    if (action === "update") {
      if (!problemId) {
        return NextResponse.json({ success: false, error: "problemId required" }, { status: 400 });
      }
      const result = await updateProblem(userId, problemId, data);
      return NextResponse.json(result);
    }

    // Default: save new problem
    const result = await saveProblem(userId, data, profileId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/problems", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
