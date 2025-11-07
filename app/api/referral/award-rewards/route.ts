import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to award rewards for a completed referral
 * POST /api/referral/award-rewards
 */
export async function POST(request: NextRequest) {
  try {
    const { referralId } = await request.json();

    if (!referralId) {
      return NextResponse.json(
        { error: "referralId is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Get referral details
    const { data: referral, error: fetchError } = await supabase
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .single();

    type Referral = {
      referrer_id: string;
      referee_id: string;
      referral_code: string;
      status: string;
      reward_type?: string;
      reward_amount?: number;
      referrer_reward_type?: string;
      referrer_reward_amount?: number;
    } | null;

    const typedReferral = referral as Referral;

    if (fetchError || !typedReferral) {
      logger.error("Error fetching referral", { error: fetchError?.message, referralId });
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // Only award if not already rewarded
    if (typedReferral.status === "rewarded") {
      logger.info("Referral already rewarded", { referralId });
      return NextResponse.json({
        success: true,
        message: "Referral already rewarded",
      });
    }

    // Default rewards (can be customized)
    const REFEREE_REWARD_XP = 100; // XP for the new user
    const REFERRER_REWARD_XP = 200; // XP for the referrer

    // Type definitions
    type XPData = { total_xp: number } | null;

    // Award XP to referee (new user)
    try {
      const { data: refereeXP, error: refereeXPError } = await supabase
        .from("xp_data")
        .select("total_xp")
        .eq("user_id", typedReferral.referee_id)
        .single();

      const typedRefereeXP = refereeXP as XPData;

      if (!refereeXPError && typedRefereeXP) {
        await (supabase
          .from("xp_data") as any)
          .update({
            total_xp: (typedRefereeXP.total_xp || 0) + REFEREE_REWARD_XP,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", typedReferral.referee_id);
      } else {
        // Create XP record if it doesn't exist
        await (supabase
          .from("xp_data") as any)
          .insert({
            user_id: typedReferral.referee_id,
            total_xp: REFEREE_REWARD_XP,
            level: 1,
            problems_solved: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
    } catch (err) {
      logger.error("Error awarding XP to referee", { error: err, refereeId: typedReferral.referee_id });
    }

    // Award XP to referrer
    try {
      const { data: referrerXP, error: referrerXPError } = await supabase
        .from("xp_data")
        .select("total_xp")
        .eq("user_id", typedReferral.referrer_id)
        .single();

      const typedReferrerXP = referrerXP as XPData;

      if (!referrerXPError && typedReferrerXP) {
        await (supabase
          .from("xp_data") as any)
          .update({
            total_xp: (typedReferrerXP.total_xp || 0) + REFERRER_REWARD_XP,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", typedReferral.referrer_id);
      } else {
        // Create XP record if it doesn't exist
        await (supabase
          .from("xp_data") as any)
          .insert({
            user_id: typedReferral.referrer_id,
            total_xp: REFERRER_REWARD_XP,
            level: 1,
            problems_solved: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
    } catch (err) {
      logger.error("Error awarding XP to referrer", { error: err, referrerId: typedReferral.referrer_id });
    }

    // Update referral status
    await (supabase
      .from("referrals") as any)
      .update({
        status: "rewarded",
        reward_type: "xp",
        reward_amount: REFEREE_REWARD_XP,
        referrer_reward_type: "xp",
        referrer_reward_amount: REFERRER_REWARD_XP,
        rewarded_at: new Date().toISOString(),
      })
      .eq("id", referralId);

    // Update referral code stats
    const { data: codeData } = await supabase
      .from("referral_codes")
      .select("total_rewards_earned")
      .eq("code", typedReferral.referral_code)
      .single();

    type ReferralCodeData = { total_rewards_earned: number } | null;
    const typedCodeData = codeData as ReferralCodeData;

    if (typedCodeData) {
      await (supabase
        .from("referral_codes") as any)
        .update({
          total_rewards_earned: (typedCodeData.total_rewards_earned || 0) + REFERRER_REWARD_XP,
          updated_at: new Date().toISOString(),
        })
        .eq("code", typedReferral.referral_code);
    }

    logger.info("Referral rewards awarded", {
      referralId,
      refereeXP: REFEREE_REWARD_XP,
      referrerXP: REFERRER_REWARD_XP,
    });

    return NextResponse.json({
      success: true,
      message: "Rewards awarded successfully",
      rewards: {
        referee: { type: "xp", amount: REFEREE_REWARD_XP },
        referrer: { type: "xp", amount: REFERRER_REWARD_XP },
      },
    });
  } catch (error) {
    logger.error("Error in award-rewards route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

