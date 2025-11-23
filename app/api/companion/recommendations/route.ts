import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getSubjectRecommendations,
  getRecommendationsFromHistory,
} from "@/services/recommendationService";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * API route to get subject recommendations
 * GET /api/companion/recommendations?userId=xxx&profileId=xxx&goalId=xxx&subject=xxx&goalType=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const goalId = searchParams.get("goalId");
    const subject = searchParams.get("subject");
    const goalType = searchParams.get("goalType");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Note: Auth is handled by the client passing userId
    // The v2 API pattern trusts the userId from the request

    let recommendations;

    // If goalId, subject, and goalType are provided, get recommendations for completed goal
    if (goalId && subject && goalType) {
      recommendations = await getSubjectRecommendations(
        userId,
        profileId || null,
        subject,
        goalType
      );
    } else {
      // Otherwise, get recommendations based on learning history
      recommendations = await getRecommendationsFromHistory(
        userId,
        profileId || null
      );
    }

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    logger.error("Error in companion/recommendations route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

