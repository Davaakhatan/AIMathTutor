/**
 * Problems API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import { getProblems, saveProblem, updateProblem, markProblemSolved, countSolvedProblems } from "@/backend/services/problemsService";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

// Helper to get the actual user_id for a student profile (owner_id)
// This is needed when a parent/teacher views a student's data
async function getEffectiveUserId(userId: string, profileId: string | null): Promise<string> {
  if (!profileId) return userId;

  const supabase = getSupabaseServer();
  if (!supabase) {
    logger.debug("getEffectiveUserId: No supabase server", { userId, profileId });
    return userId;
  }

  const { data: profile, error } = await supabase
    .from("student_profiles")
    .select("owner_id")
    .eq("id", profileId)
    .single();

  logger.debug("getEffectiveUserId lookup result", {
    userId,
    profileId,
    foundOwnerId: profile?.owner_id,
    error: error?.message
  });

  return profile?.owner_id || userId;
}

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

    // Get the actual user_id for the student profile (owner_id)
    // This is needed when a parent/teacher views a student's data
    const effectiveUserId = await getEffectiveUserId(userId, profileId);

    if (action === "countSolved") {
      const result = await countSolvedProblems(effectiveUserId, profileId);
      return NextResponse.json(result);
    }

    const result = await getProblems(effectiveUserId, profileId, limit);
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
