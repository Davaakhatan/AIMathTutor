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
    const { data: referral, error: fetchError } = await (supabase as any)
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

    // Helper function to calculate level from total XP (matches orchestrator.ts)
    // Level 1: 0-100, Level 2: 100-250, Level 3: 250-450, etc.
    // The formula calculates TOTAL XP needed for a level, not incremental
    const calculateLevel = (totalXP: number): number => {
      if (totalXP < 100) return 1;
      
      let level = 1;
      let totalXPForLevel = 100; // Total XP needed for level 2

      // Keep checking if we've reached the next level threshold
      while (totalXP >= totalXPForLevel) {
        level++;
        totalXPForLevel = Math.round(100 * (level - 1) * 1.5 + 100);
      }

      return level;
    };

    // Helper function to calculate XP needed for next level (matches orchestrator.ts)
    const calculateXPForLevel = (level: number): number => {
      return Math.round(100 * (level - 1) * 1.5 + 100);
    };

    // Award XP to referee (new user)
    // Query for personal XP (not linked to student profile)
    try {
      const { data: refereeXPData, error: refereeXPError } = await (supabase as any)
        .from("xp_data")
        .select("total_xp, level, xp_to_next_level, xp_history")
        .eq("user_id", typedReferral.referee_id)
        .is("student_profile_id", null)
        .single();

      if (!refereeXPError && refereeXPData) {
        // Update existing XP with proper level calculation
        const currentTotalXP = refereeXPData.total_xp || 0;
        const newTotalXP = currentTotalXP + REFEREE_REWARD_XP;
        const newLevel = calculateLevel(newTotalXP);
        const xpForNextLevel = calculateXPForLevel(newLevel + 1);
        const xpToNextLevel = xpForNextLevel - newTotalXP;

        const today = new Date().toISOString().split('T')[0];
        const now = Date.now();
        const currentHistory = (refereeXPData.xp_history as any[]) || [];
        const updatedHistory = [
          ...currentHistory,
          {
            date: today,
            xp: REFEREE_REWARD_XP,
            reason: "Referral Bonus",
            timestamp: now, // Add timestamp for recent activity sorting
          },
        ];

        await (supabase as any)
          .from("xp_data")
          .update({
            total_xp: newTotalXP,
            level: newLevel,
            xp_to_next_level: xpToNextLevel,
            xp_history: updatedHistory,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", typedReferral.referee_id)
          .is("student_profile_id", null);

        logger.info("XP awarded to referee", {
          refereeId: typedReferral.referee_id,
          xpGained: REFEREE_REWARD_XP,
          newTotalXP,
          newLevel,
        });
      } else {
        // Create XP record if it doesn't exist
        const newLevel = calculateLevel(REFEREE_REWARD_XP);
        const xpForNextLevel = calculateXPForLevel(newLevel + 1);
        const xpToNextLevel = xpForNextLevel - REFEREE_REWARD_XP;

        await (supabase as any)
          .from("xp_data")
          .insert({
            user_id: typedReferral.referee_id,
            student_profile_id: null, // Personal XP
            total_xp: REFEREE_REWARD_XP,
            level: newLevel,
            xp_to_next_level: xpToNextLevel,
            xp_history: [{ date: new Date().toISOString().split('T')[0], xp: REFEREE_REWARD_XP, reason: "Referral Bonus" }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        logger.info("XP record created for referee", {
          refereeId: typedReferral.referee_id,
          totalXP: REFEREE_REWARD_XP,
          level: newLevel,
        });
      }
    } catch (err) {
      logger.error("Error awarding XP to referee", { error: err, refereeId: typedReferral.referee_id });
    }

    // Award XP to referrer
    // Query for personal XP (not linked to student profile)
    try {
      const { data: referrerXPData, error: referrerXPError } = await (supabase as any)
        .from("xp_data")
        .select("total_xp, level, xp_to_next_level, xp_history")
        .eq("user_id", typedReferral.referrer_id)
        .is("student_profile_id", null)
        .single();

      if (!referrerXPError && referrerXPData) {
        // Update existing XP with proper level calculation
        const currentTotalXP = referrerXPData.total_xp || 0;
        const newTotalXP = currentTotalXP + REFERRER_REWARD_XP;
        const newLevel = calculateLevel(newTotalXP);
        const xpForNextLevel = calculateXPForLevel(newLevel + 1);
        const xpToNextLevel = Math.max(0, xpForNextLevel - newTotalXP);

        const today = new Date().toISOString().split('T')[0];
        const now = Date.now();
        const currentHistory = (referrerXPData.xp_history as any[]) || [];
        const updatedHistory = [
          ...currentHistory,
          {
            date: today,
            xp: REFERRER_REWARD_XP,
            reason: "Referral Bonus",
            timestamp: now, // Add timestamp for recent activity sorting
          },
        ];

        logger.info("Updating referrer XP", {
          referrerId: typedReferral.referrer_id,
          currentTotalXP,
          newTotalXP,
          newLevel,
          xpToNextLevel,
          xpGained: REFERRER_REWARD_XP,
        });

        const { error: updateError } = await (supabase as any)
          .from("xp_data")
          .update({
            total_xp: newTotalXP,
            level: newLevel,
            xp_to_next_level: xpToNextLevel,
            xp_history: updatedHistory,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", typedReferral.referrer_id)
          .is("student_profile_id", null);

        if (updateError) {
          logger.error("Error updating referrer XP", { error: updateError, referrerId: typedReferral.referrer_id });
        }

        logger.info("XP awarded to referrer", {
          referrerId: typedReferral.referrer_id,
          xpGained: REFERRER_REWARD_XP,
          newTotalXP,
          newLevel,
        });

        // Dispatch event to trigger XP refresh on the referrer's client
        // This will be picked up by the XP system to refresh the UI
        try {
          // Note: This is server-side, so we can't dispatch browser events directly
          // The client will need to poll or we can add a notification system
          // For now, the polling mechanism in useXPData should pick this up
        } catch (eventError) {
          // Ignore event errors - polling will handle it
        }
      } else {
        // Create XP record if it doesn't exist
        const newLevel = calculateLevel(REFERRER_REWARD_XP);
        const xpForNextLevel = calculateXPForLevel(newLevel + 1);
        const xpToNextLevel = xpForNextLevel - REFERRER_REWARD_XP;

        await (supabase as any)
          .from("xp_data")
          .insert({
            user_id: typedReferral.referrer_id,
            student_profile_id: null, // Personal XP
            total_xp: REFERRER_REWARD_XP,
            level: newLevel,
            xp_to_next_level: xpToNextLevel,
            xp_history: [{ date: new Date().toISOString().split('T')[0], xp: REFERRER_REWARD_XP, reason: "Referral Bonus" }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        logger.info("XP record created for referrer", {
          referrerId: typedReferral.referrer_id,
          totalXP: REFERRER_REWARD_XP,
          level: newLevel,
        });
      }
    } catch (err) {
      logger.error("Error awarding XP to referrer", { error: err, referrerId: typedReferral.referrer_id });
    }

    // Update referral status
    const { error: updateError } = await (supabase as any)
      .from("referrals")
      .update({
        status: "rewarded",
        rewards_awarded: true,
        reward_type: "xp",
        reward_amount: REFEREE_REWARD_XP,
        referrer_reward_type: "xp",
        referrer_reward_amount: REFERRER_REWARD_XP,
        rewarded_at: new Date().toISOString(),
      })
      .eq("id", referralId);

    if (updateError) {
      logger.error("Error updating referral status", { error: updateError, referralId });
    }

    // Update referral code stats
    const { data: codeData } = await (supabase as any)
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

