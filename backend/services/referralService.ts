/**
 * Referral Backend Service
 * Handles all referral-related database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

// Types
interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalRewardsEarned: number;
  referralCode: string;
  referralUrl: string | null;
  totalSignups: number;
}

interface Referral {
  id: string;
  referral_code: string;
  status: string;
  created_at: string;
  referrer_reward_amount: number;
}

// Helper function to calculate level from total XP
const calculateLevel = (totalXP: number): number => {
  if (totalXP < 100) return 1;

  let level = 1;
  let totalXPForLevel = 100;

  while (totalXP >= totalXPForLevel) {
    level++;
    totalXPForLevel = Math.round(100 * (level - 1) * 1.5 + 100);
  }

  return level;
};

// Helper function to calculate XP needed for next level
const calculateXPForLevel = (level: number): number => {
  return Math.round(100 * (level - 1) * 1.5 + 100);
};

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string, origin?: string): Promise<{ success: boolean; stats?: ReferralStats; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    // Get referral code
    const { data: codeData, error: codeError } = await (supabase as any)
      .from("referral_codes")
      .select("code, total_signups, total_rewards_earned")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    let finalCodeData = codeData;

    // If no referral code exists, create one
    if (codeError && codeError.code === "PGRST116") {
      logger.info("No referral code found, creating one", { userId });
      const { data: newCode, error: rpcError } = await (supabase.rpc as any)(
        "get_or_create_referral_code",
        { p_user_id: userId }
      );

      if (!rpcError && newCode) {
        const { data: fetchedCodes } = await (supabase as any)
          .from("referral_codes")
          .select("code, total_signups, total_rewards_earned")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (fetchedCodes && fetchedCodes.length > 0) {
          finalCodeData = fetchedCodes[0];
        } else {
          finalCodeData = {
            code: newCode,
            total_signups: 0,
            total_rewards_earned: 0,
          };
        }
      }
    }

    // Get referral counts
    const { data: referrals } = await (supabase as any)
      .from("referrals")
      .select("id, status")
      .eq("referrer_id", userId);

    const typedReferrals = (referrals || []) as Array<{ id: string; status: string }>;
    const totalReferrals = typedReferrals.length;
    const completedReferrals = typedReferrals.filter(
      (r) => r.status === "completed" || r.status === "rewarded"
    ).length;

    const referralCode = finalCodeData?.code || "";
    const referralUrl = referralCode && origin
      ? `${origin}/signup?ref=${referralCode}`
      : referralCode
      ? `/signup?ref=${referralCode}`
      : null;

    return {
      success: true,
      stats: {
        totalReferrals,
        completedReferrals,
        totalRewardsEarned: finalCodeData?.total_rewards_earned || 0,
        referralCode,
        referralUrl,
        totalSignups: finalCodeData?.total_signups || 0,
      },
    };
  } catch (error) {
    logger.error("Error getting referral stats", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Get list of referrals for a user
 */
export async function getReferralList(userId: string): Promise<{ success: boolean; referrals?: Referral[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { data, error } = await (supabase as any)
      .from("referrals")
      .select("id, referral_code, status, created_at, referrer_reward_amount")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      logger.error("Error fetching referrals", { error, userId });
      return { success: false, error: error.message };
    }

    const referrals = (data || []).map((r: any) => ({
      id: r.id,
      referral_code: r.referral_code,
      status: r.status,
      created_at: r.created_at,
      referrer_reward_amount: r.referrer_reward_amount || 0,
    }));

    return { success: true, referrals };
  } catch (error) {
    logger.error("Error in getReferralList", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Track a referral signup
 */
export async function trackReferralSignup(
  referralCode: string,
  refereeId: string
): Promise<{ success: boolean; referralId?: string; referral?: any; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    // Call RPC function to track referral signup
    const { data: referralId, error: rpcError } = await (supabase.rpc as any)(
      "track_referral_signup",
      {
        p_referral_code: referralCode.toUpperCase().trim(),
        p_referee_id: refereeId,
      }
    );

    if (rpcError) {
      logger.error("Error tracking referral signup", { error: rpcError.message, referralCode, refereeId });
      return { success: false, error: rpcError.message };
    }

    // Get the created referral record
    const { data: referral, error: fetchError } = await (supabase as any)
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .single();

    if (fetchError || !referral) {
      logger.error("Error fetching referral after creation", { error: fetchError?.message, referralId });
      return { success: false, error: "Referral tracked but failed to fetch details" };
    }

    logger.info("Referral signup tracked successfully", {
      referralId,
      referralCode,
      referrerId: referral.referrer_id,
      refereeId,
    });

    return { success: true, referralId, referral };
  } catch (error) {
    logger.error("Error in trackReferralSignup", { error, referralCode, refereeId });
    return { success: false, error: String(error) };
  }
}

/**
 * Award rewards for a completed referral
 */
export async function awardReferralRewards(referralId: string): Promise<{
  success: boolean;
  rewards?: { referee: { type: string; amount: number }; referrer: { type: string; amount: number } };
  error?: string
}> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    // Get referral details
    const { data: referral, error: fetchError } = await (supabase as any)
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .single();

    if (fetchError || !referral) {
      logger.error("Error fetching referral", { error: fetchError?.message, referralId });
      return { success: false, error: "Referral not found" };
    }

    // Only award if not already rewarded
    if (referral.status === "rewarded") {
      logger.info("Referral already rewarded", { referralId });
      return { success: true, rewards: { referee: { type: "xp", amount: 0 }, referrer: { type: "xp", amount: 0 } } };
    }

    const REFEREE_REWARD_XP = 100;
    const REFERRER_REWARD_XP = 200;

    // Award XP to referee
    await awardXPToUser(supabase, referral.referee_id, REFEREE_REWARD_XP, "Referral Bonus");

    // Award XP to referrer
    await awardXPToUser(supabase, referral.referrer_id, REFERRER_REWARD_XP, "Referral Bonus");

    // Update referral status
    await (supabase as any)
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

    // Update referral code stats
    const { data: codeData } = await (supabase as any)
      .from("referral_codes")
      .select("total_rewards_earned")
      .eq("code", referral.referral_code)
      .single();

    if (codeData) {
      await (supabase as any)
        .from("referral_codes")
        .update({
          total_rewards_earned: (codeData.total_rewards_earned || 0) + REFERRER_REWARD_XP,
          updated_at: new Date().toISOString(),
        })
        .eq("code", referral.referral_code);
    }

    logger.info("Referral rewards awarded", {
      referralId,
      refereeXP: REFEREE_REWARD_XP,
      referrerXP: REFERRER_REWARD_XP,
    });

    return {
      success: true,
      rewards: {
        referee: { type: "xp", amount: REFEREE_REWARD_XP },
        referrer: { type: "xp", amount: REFERRER_REWARD_XP },
      },
    };
  } catch (error) {
    logger.error("Error in awardReferralRewards", { error, referralId });
    return { success: false, error: String(error) };
  }
}

// Helper function to award XP to a user
async function awardXPToUser(supabase: any, userId: string, xpAmount: number, reason: string): Promise<void> {
  try {
    const { data: xpData, error: xpError } = await supabase
      .from("xp_data")
      .select("total_xp, level, xp_to_next_level, xp_history")
      .eq("user_id", userId)
      .is("student_profile_id", null)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();

    if (!xpError && xpData) {
      const currentTotalXP = xpData.total_xp || 0;
      const newTotalXP = currentTotalXP + xpAmount;
      const newLevel = calculateLevel(newTotalXP);
      const xpForNextLevel = calculateXPForLevel(newLevel + 1);
      const xpToNextLevel = Math.max(0, xpForNextLevel - newTotalXP);

      const currentHistory = (xpData.xp_history || []) as any[];
      const updatedHistory = [
        ...currentHistory,
        { date: today, xp: xpAmount, reason, timestamp: now },
      ];

      await supabase
        .from("xp_data")
        .update({
          total_xp: newTotalXP,
          level: newLevel,
          xp_to_next_level: xpToNextLevel,
          xp_history: updatedHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .is("student_profile_id", null);

      logger.info("XP awarded to user", { userId, xpGained: xpAmount, newTotalXP, newLevel });
    } else {
      // Create XP record if it doesn't exist
      const newLevel = calculateLevel(xpAmount);
      const xpForNextLevel = calculateXPForLevel(newLevel + 1);
      const xpToNextLevel = xpForNextLevel - xpAmount;

      await supabase
        .from("xp_data")
        .insert({
          user_id: userId,
          student_profile_id: null,
          total_xp: xpAmount,
          level: newLevel,
          xp_to_next_level: xpToNextLevel,
          xp_history: [{ date: today, xp: xpAmount, reason, timestamp: now }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      logger.info("XP record created for user", { userId, totalXP: xpAmount, level: newLevel });
    }
  } catch (err) {
    logger.error("Error awarding XP to user", { error: err, userId });
  }
}
