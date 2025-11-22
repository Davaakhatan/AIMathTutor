/**
 * XP API v2 - Clean backend separation
 * GET: Fetch XP data
 * POST: Update XP data
 */

import { NextRequest, NextResponse } from "next/server";
import { getXP, updateXP, awardProblemXP, awardLoginBonus } from "@/backend/services/xpService";
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
    const xpData = await getXP(userId, effectiveProfileId);

    if (!xpData) {
      // Return default data
      return NextResponse.json({
        success: true,
        data: {
          total_xp: 0,
          level: 1,
          xp_to_next_level: 100,
          xp_history: [],
          recent_gains: [],
        }
      });
    }

    // Format recent gains from history
    const recentGains = xpData.xp_history
      .map(entry => ({
        xp: entry.xp,
        reason: entry.reason,
        timestamp: entry.timestamp || new Date(entry.date).getTime(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        total_xp: xpData.total_xp,
        level: xpData.level,
        xp_to_next_level: xpData.xp_to_next_level,
        xp_history: xpData.xp_history,
        recent_gains: recentGains,
      }
    });
  } catch (error) {
    logger.error("API v2: Error in GET /api/v2/xp", { error });
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

    // Handle different actions
    switch (action) {
      case "award_problem": {
        const { problemType, difficulty, hintsUsed } = payload;
        const result = await awardProblemXP(userId, problemType, difficulty, hintsUsed, effectiveProfileId);
        return NextResponse.json({ success: result.success, data: result });
      }

      case "award_login": {
        const { isFirstLogin } = payload;
        const result = await awardLoginBonus(userId, isFirstLogin, effectiveProfileId);
        return NextResponse.json({ success: result.success, data: result });
      }

      case "update": {
        const { xpData } = payload;
        if (!xpData) {
          return NextResponse.json({ success: false, error: "xpData required" }, { status: 400 });
        }
        const success = await updateXP(userId, xpData, effectiveProfileId);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("API v2: Error in POST /api/v2/xp", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
