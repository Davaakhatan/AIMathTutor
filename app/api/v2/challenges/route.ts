/**
 * Challenges API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getChallenges,
  saveChallenge,
  updateChallengeProgress,
  completeChallenge,
  deleteChallenge
} from "@/backend/services/challengesService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const result = await getChallenges(userId, profileId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/challenges", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, action, challengeId, ...data } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    // Update progress
    if (action === "updateProgress") {
      if (!challengeId || data.currentCount === undefined) {
        return NextResponse.json({ success: false, error: "challengeId and currentCount required" }, { status: 400 });
      }
      const result = await updateChallengeProgress(userId, challengeId, data.currentCount);
      return NextResponse.json(result);
    }

    // Complete challenge
    if (action === "complete") {
      if (!challengeId) {
        return NextResponse.json({ success: false, error: "challengeId required" }, { status: 400 });
      }
      const result = await completeChallenge(userId, challengeId);
      return NextResponse.json(result);
    }

    // Save new challenge (default)
    const result = await saveChallenge(userId, data, profileId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/challenges", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const challengeId = searchParams.get("challengeId");

    if (!userId || !challengeId) {
      return NextResponse.json({ success: false, error: "userId and challengeId required" }, { status: 400 });
    }

    const result = await deleteChallenge(userId, challengeId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in DELETE /api/v2/challenges", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
