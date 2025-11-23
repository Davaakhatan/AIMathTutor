/**
 * Problem Completed API v2 - Awards XP, updates streak, and saves problem
 * This is the SINGLE endpoint the frontend calls when a problem is solved
 */

import { NextRequest, NextResponse } from "next/server";
import { awardProblemXP } from "@/backend/services/xpService";
import { incrementStreak } from "@/backend/services/streakService";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, problemType, difficulty, hintsUsed, problemText } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    if (!problemType) {
      return NextResponse.json({ success: false, error: "problemType required" }, { status: 400 });
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.info("API v2: Problem completed - awarding XP, updating streak, and saving problem", {
      userId,
      problemType,
      difficulty,
      hintsUsed,
      hasProblemText: !!problemText
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

    // Save problem to database (for leaderboard count)
    let problemSaved = false;
    try {
      const supabase = getSupabaseServer();
      if (supabase) {
        const { error: problemError } = await supabase
          .from("problems")
          .insert({
            user_id: userId,
            student_profile_id: effectiveProfileId,
            text: problemText || `Solved ${problemType} problem`,
            type: problemType,
            difficulty: difficulty || "medium",
            solved_at: new Date().toISOString(),
            hints_used: hintsUsed || 0,
            source: "completed",
          });

        if (problemError) {
          logger.warn("API v2: Failed to save problem record", { error: problemError.message });
        } else {
          problemSaved = true;
          logger.debug("API v2: Problem saved to database", { userId, problemType });
        }
      }
    } catch (saveError) {
      logger.warn("API v2: Error saving problem", { error: saveError });
    }

    if (xpResult.success && streakResult.success) {
      logger.info("API v2: Problem completion rewards applied", {
        userId,
        xpGained: xpResult.xpGained,
        newTotal: xpResult.newTotal,
        newLevel: xpResult.newLevel,
        streak: streakResult.currentStreak,
        problemSaved
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
        },
        problemSaved
      }
    });
  } catch (error) {
    logger.error("API v2: Error in POST /api/v2/problem-completed", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
