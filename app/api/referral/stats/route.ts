import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

// Force dynamic rendering (this route uses request.url)
export const dynamic = 'force-dynamic';

/**
 * API route to get referral statistics for a user
 * GET /api/referral/stats?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Get referral code
    const { data: codeData, error: codeError } = await (supabase as any)
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

    // If no referral code exists, create one using the RPC function
    let finalCodeData = typedCodeData;
    if (codeError && codeError.code === "PGRST116") {
      // No code found - try to create one
      try {
        logger.info("No referral code found, creating one", { userId });
        const { data: newCode, error: rpcError } = await (supabase.rpc as any)(
          "get_or_create_referral_code",
          { p_user_id: userId }
        );
        
        if (rpcError) {
          logger.error("RPC error creating referral code", { error: rpcError, userId });
        }
        
        if (!rpcError && newCode) {
          logger.info("Referral code created via RPC", { userId, code: newCode });
          // Fetch the newly created code (use limit(1) to handle duplicates)
          const { data: fetchedCodes, error: fetchError } = await (supabase as any)
            .from("referral_codes")
            .select("code, total_signups, total_rewards_earned")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (fetchError) {
            logger.error("Error fetching newly created code", { error: fetchError, userId });
          } else if (fetchedCodes && fetchedCodes.length > 0) {
            finalCodeData = fetchedCodes[0] as CodeData;
            logger.info("Successfully fetched new referral code", { userId, code: finalCodeData?.code });
          } else {
            logger.warn("No code found after creation", { userId, newCode });
            // Use the code returned from RPC directly
            finalCodeData = {
              code: newCode,
              total_signups: 0,
              total_rewards_earned: 0,
            };
          }
        } else if (!newCode) {
          logger.warn("RPC returned no code", { userId });
        }
      } catch (createError) {
        logger.error("Exception creating referral code", { error: createError, userId });
      }
    } else if (codeError) {
      logger.error("Error fetching referral code", { error: codeError, userId, code: codeError.code });
    }

    // Get referral counts
    const { data: referrals, error: referralsError } = await (supabase as any)
      .from("referrals")
      .select("id, status")
      .eq("referrer_id", userId);

    if (referralsError) {
      logger.error("Error fetching referrals", { error: referralsError, userId });
    }

    type Referral = { id: string; status: string };
    const typedReferrals = (referrals as Referral[]) || [];

    const totalReferrals = typedReferrals.length;
    const completedReferrals = typedReferrals.filter(
      (r) => r.status === "completed" || r.status === "rewarded"
    ).length;

    // If we still don't have a code, try one more time to create it directly
    if (!finalCodeData || !finalCodeData.code) {
      logger.warn("No referral code found after all attempts, creating directly", { userId });
      try {
        const { data: newCode, error: finalRpcError } = await (supabase.rpc as any)(
          "get_or_create_referral_code",
          { p_user_id: userId }
        );
        
        if (!finalRpcError && newCode) {
          // Fetch it one more time
          const { data: finalFetch, error: finalFetchError } = await (supabase as any)
            .from("referral_codes")
            .select("code, total_signups, total_rewards_earned")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (!finalFetchError && finalFetch && finalFetch.length > 0) {
            finalCodeData = finalFetch[0] as CodeData;
          } else if (newCode) {
            // Use the code from RPC even if we can't fetch it
            finalCodeData = {
              code: newCode,
              total_signups: 0,
              total_rewards_earned: 0,
            };
          }
        }
      } catch (finalError) {
        logger.error("Final attempt to create referral code failed", { error: finalError, userId });
      }
    }

    // Use request origin for proper URL generation
    const origin = request.nextUrl.origin || "";
    const referralCode = finalCodeData?.code || "";
    const referralUrl = referralCode && origin
      ? `${origin}/signup?ref=${referralCode}`
      : referralCode
      ? `/signup?ref=${referralCode}`
      : null;

    return NextResponse.json({
      success: true,
      stats: {
        totalReferrals,
        completedReferrals,
        totalRewardsEarned: finalCodeData?.total_rewards_earned || 0,
        referralCode: referralCode,
        referralUrl,
        totalSignups: finalCodeData?.total_signups || 0,
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

