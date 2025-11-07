/**
 * Referral Service
 * Handles referral code generation, tracking, and rewards
 */

import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  total_signups: number;
  total_rewards_earned: number;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_code: string;
  status: "pending" | "completed" | "rewarded";
  reward_type?: string;
  reward_amount?: number;
  referrer_reward_type?: string;
  referrer_reward_amount?: number;
  created_at: string;
  completed_at?: string;
  rewarded_at?: string;
  metadata?: Record<string, any>;
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalRewardsEarned: number;
  referralCode: string;
  referralUrl: string;
}

/**
 * Get or create referral code for current user
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  try {
    const supabase = await getSupabaseClient();
    
    // Check if user already has an active referral code
    const { data: existingCode, error: fetchError } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (existingCode && !fetchError) {
      logger.info("Found existing referral code", { userId, code: existingCode.code });
      return existingCode.code;
    }

    // Call RPC function to generate new code
    const { data: newCode, error: rpcError } = await supabase
      .rpc("get_or_create_referral_code", { p_user_id: userId });

    if (rpcError || !newCode) {
      logger.error("Error generating referral code via RPC", { error: rpcError, userId });
      
      // Fallback: Generate code client-side and insert
      const fallbackCode = generateReferralCode();
      const { error: insertError } = await supabase
        .from("referral_codes")
        .insert({
          user_id: userId,
          code: fallbackCode,
          is_active: true,
        } as any);

      if (insertError) {
        logger.error("Error inserting referral code", { error: insertError, userId });
        throw new Error("Failed to create referral code");
      }

      return fallbackCode;
    }

    logger.info("Generated new referral code", { userId, code: newCode });
    return newCode;
  } catch (error) {
    logger.error("Error in getOrCreateReferralCode", { error, userId });
    throw error;
  }
}

/**
 * Generate a random referral code (8 characters, alphanumeric)
 */
function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Track referral signup (called when a new user signs up with a referral code)
 */
export async function trackReferralSignup(
  referralCode: string,
  refereeId: string
): Promise<Referral> {
  try {
    // Use API route to track referral (bypasses RLS and uses service role)
    const response = await fetch("/api/referral/track-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode: referralCode.toUpperCase().trim(),
        refereeId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to track referral signup");
    }

    const result = await response.json();
    logger.info("Referral signup tracked", { referralCode, refereeId, referralId: result.referralId });
    
    return result.referral;
  } catch (error) {
    logger.error("Error tracking referral signup", { error, referralCode, refereeId });
    throw error;
  }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    const supabase = await getSupabaseClient();

    // Get referral code
    const { data: codeData, error: codeError } = await supabase
      .from("referral_codes")
      .select("code, total_signups, total_rewards_earned")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (codeError || !codeData) {
      // If no code exists, create one
      const newCode = await getOrCreateReferralCode(userId);
      const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${newCode}`;
      
      return {
        totalReferrals: 0,
        completedReferrals: 0,
        totalRewardsEarned: 0,
        referralCode: newCode,
        referralUrl,
      };
    }

    // Get referral counts
    const { data: referrals, error: referralsError } = await supabase
      .from("referrals")
      .select("id, status")
      .eq("referrer_id", userId);

    const totalReferrals = referrals?.length || 0;
    const completedReferrals = referrals?.filter((r: Referral) => r.status === "completed" || r.status === "rewarded").length || 0;

    // Safe origin detection for SSR
    const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
    const referralUrl = origin ? `${origin}/signup?ref=${codeData.code}` : `/signup?ref=${codeData.code}`;

    return {
      totalReferrals,
      completedReferrals,
      totalRewardsEarned: codeData.total_rewards_earned || 0,
      referralCode: codeData.code,
      referralUrl,
    };
  } catch (error) {
    logger.error("Error getting referral stats", { error, userId });
    throw error;
  }
}

/**
 * Get list of referrals for a user (who they referred)
 */
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching user referrals", { error, userId });
      throw error;
    }

    return (data as Referral[]) || [];
  } catch (error) {
    logger.error("Error in getUserReferrals", { error, userId });
    return [];
  }
}

/**
 * Award rewards for a completed referral
 */
export async function awardReferralRewards(referralId: string): Promise<void> {
  try {
    // Use API route to award rewards (handles XP, streaks, etc.)
    const response = await fetch("/api/referral/award-rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to award referral rewards");
    }

    logger.info("Referral rewards awarded", { referralId });
  } catch (error) {
    logger.error("Error awarding referral rewards", { error, referralId });
    throw error;
  }
}

/**
 * Validate referral code
 */
export async function validateReferralCode(code: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from("referral_codes")
      .select("id")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error validating referral code", { error, code });
    return false;
  }
}

