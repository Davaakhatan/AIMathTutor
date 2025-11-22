/**
 * Solved Problems API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import { getSolvedProblems } from "@/backend/services/problemsService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const result = await getSolvedProblems(userId, profileId, limit);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/problems/solved", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
