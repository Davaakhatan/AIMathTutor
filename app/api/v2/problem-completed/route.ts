/**
 * Problem Completed API v2 - Awards XP and updates streak
 * This is the SINGLE endpoint the frontend calls when a problem is solved
 */

import { NextRequest, NextResponse } from "next/server";
import { awardProblemXP } from "@/backend/services/xpService";
import { incrementStreak } from "@/backend/services/streakService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, problemType, difficulty, hintsUsed } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    if (!problemType) {
      return NextResponse.json({ success: false, error: "problemType required" }, { status: 400 });
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.info("API v2: Problem completed - awarding XP and updating streak", {
      userId,
      problemType,
      difficulty,
      hintsUsed
    });

    // Award XP
    const xpResult = await awardProblemXP(
      userId,
      problemType,
      difficulty || "medium",
      hintsUsed || 0,
      effectiveProfileId
    );

    // Update streak
    const streakResult = await incrementStreak(userId, effectiveProfileId);

    if (xpResult.success && streakResult.success) {
      logger.info("API v2: Problem completion rewards applied", {
        userId,
        xpGained: xpResult.xpGained,
        newTotal: xpResult.newTotal,
        newLevel: xpResult.newLevel,
        streak: streakResult.currentStreak
      });
    }

    return NextResponse.json({
      success: xpResult.success && streakResult.success,
      data: {
        xp: {
          gained: xpResult.xpGained,
          total: xpResult.newTotal,
          level: xpResult.newLevel,
        },
        streak: {
          current: streakResult.currentStreak,
          longest: streakResult.longestStreak,
        }
      }
    });
  } catch (error) {
    logger.error("API v2: Error in POST /api/v2/problem-completed", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
