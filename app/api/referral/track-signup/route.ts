import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to track referral signup
 * Called when a new user signs up with a referral code
 * POST /api/referral/track-signup
 */
export async function POST(request: NextRequest) {
  try {
    const { referralCode, refereeId } = await request.json();

    if (!referralCode || !refereeId) {
      return NextResponse.json(
        { error: "referralCode and refereeId are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Call RPC function to track referral signup
    const { data: referralId, error: rpcError } = await supabase.rpc(
      "track_referral_signup",
      {
        p_referral_code: referralCode.toUpperCase().trim(),
        p_referee_id: refereeId,
      }
    );

    if (rpcError) {
      logger.error("Error tracking referral signup", {
        error: rpcError.message,
        referralCode,
        refereeId,
      });
      return NextResponse.json(
        { error: rpcError.message || "Failed to track referral signup" },
        { status: 500 }
      );
    }

    // Get the created referral record
    const { data: referral, error: fetchError } = await supabase
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .single();

    if (fetchError || !referral) {
      logger.error("Error fetching referral after creation", {
        error: fetchError?.message,
        referralId,
      });
      return NextResponse.json(
        { error: "Referral tracked but failed to fetch details" },
        { status: 500 }
      );
    }

    logger.info("Referral signup tracked successfully", {
      referralId,
      referralCode,
      referrerId: referral.referrer_id,
      refereeId,
    });

    // Award rewards in background (don't wait)
    fetch(`${request.nextUrl.origin}/api/referral/award-rewards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralId }),
    }).catch((err) => {
      logger.error("Error awarding rewards in background", { error: err, referralId });
    });

    return NextResponse.json({
      success: true,
      referralId,
      referral: referral,
    });
  } catch (error) {
    logger.error("Error in track-signup route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

