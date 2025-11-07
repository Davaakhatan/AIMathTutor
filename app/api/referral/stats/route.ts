import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to get referral statistics for a user
 * GET /api/referral/stats?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Get referral code
    const { data: codeData, error: codeError } = await supabase
      .from("referral_codes")
      .select("code, total_signups, total_rewards_earned")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    type CodeData = {
      code: string;
      total_signups: number;
      total_rewards_earned: number;
    } | null;

    const typedCodeData = codeData as CodeData;

    // Get referral counts
    const { data: referrals, error: referralsError } = await supabase
      .from("referrals")
      .select("id, status")
      .eq("referrer_id", userId);

    type Referral = { id: string; status: string };
    const typedReferrals = (referrals as Referral[]) || [];

    const totalReferrals = typedReferrals.length;
    const completedReferrals = typedReferrals.filter(
      (r) => r.status === "completed" || r.status === "rewarded"
    ).length;

    const referralUrl = typedCodeData
      ? `${request.nextUrl.origin}/signup?ref=${typedCodeData.code}`
      : null;

    return NextResponse.json({
      success: true,
      stats: {
        totalReferrals,
        completedReferrals,
        totalRewardsEarned: typedCodeData?.total_rewards_earned || 0,
        referralCode: typedCodeData?.code || null,
        referralUrl,
        totalSignups: typedCodeData?.total_signups || 0,
      },
    });
  } catch (error) {
    logger.error("Error in referral/stats route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

