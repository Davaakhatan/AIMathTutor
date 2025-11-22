/**
 * Referral API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getReferralStats,
  getReferralList,
  trackReferralSignup,
  awardReferralRewards,
} from "@/backend/services/referralService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    // Get referral list
    if (action === "list") {
      const result = await getReferralList(userId);
      return NextResponse.json(result);
    }

    // Get stats (default)
    const origin = request.nextUrl.origin || "";
    const result = await getReferralStats(userId, origin);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/referral", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referralCode, refereeId, referralId } = body;

    // Track signup
    if (action === "trackSignup") {
      if (!referralCode || !refereeId) {
        return NextResponse.json(
          { success: false, error: "referralCode and refereeId required" },
          { status: 400 }
        );
      }

      const result = await trackReferralSignup(referralCode, refereeId);

      if (result.success && result.referralId) {
        // Award rewards immediately
        const rewardResult = await awardReferralRewards(result.referralId);
        return NextResponse.json({
          ...result,
          rewardsAwarded: rewardResult.success,
          rewards: rewardResult.rewards,
        });
      }

      return NextResponse.json(result);
    }

    // Award rewards
    if (action === "awardRewards") {
      if (!referralId) {
        return NextResponse.json(
          { success: false, error: "referralId required" },
          { status: 400 }
        );
      }

      const result = await awardReferralRewards(referralId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Error in POST /api/v2/referral", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
