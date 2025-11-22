/**
 * Streak API v2 - Clean backend separation
 */

import { NextRequest, NextResponse } from "next/server";
import { getStreak, updateStreak, incrementStreak } from "@/backend/services/streakService";
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

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;
    const streakData = await getStreak(userId, effectiveProfileId);

    if (!streakData) {
      return NextResponse.json({
        success: true,
        data: {
          current_streak: 0,
          longest_streak: 0,
          last_study_date: null,
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        current_streak: streakData.current_streak,
        longest_streak: streakData.longest_streak,
        last_study_date: streakData.last_study_date,
      }
    });
  } catch (error) {
    logger.error("API v2: Error in GET /api/v2/streak", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, action, ...payload } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    switch (action) {
      case "increment": {
        const result = await incrementStreak(userId, effectiveProfileId);
        return NextResponse.json({ success: result.success, data: result });
      }

      case "update": {
        const { streakData } = payload;
        if (!streakData) {
          return NextResponse.json({ success: false, error: "streakData required" }, { status: 400 });
        }
        const success = await updateStreak(userId, streakData, effectiveProfileId);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("API v2: Error in POST /api/v2/streak", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
