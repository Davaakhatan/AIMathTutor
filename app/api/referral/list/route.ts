import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

// Force dynamic rendering (this route uses request.nextUrl)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    const { data, error } = await (supabase as any)
      .from("referrals")
      .select("id, referral_code, status, created_at, referrer_reward_amount")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      logger.error("Error fetching referrals", { error, userId });
      return NextResponse.json(
        { error: "Failed to fetch referrals", details: error.message },
        { status: 500 }
      );
    }

    type ReferralData = {
      id: string;
      referral_code: string;
      status: string;
      created_at: string;
      referrer_reward_amount: number | null;
    };

    const typedData = (data as ReferralData[]) || [];

    return NextResponse.json({
      success: true,
      referrals: typedData.map((r) => ({
        id: r.id,
        referral_code: r.referral_code,
        status: r.status,
        created_at: r.created_at,
        referrer_reward_amount: r.referrer_reward_amount || 0,
      })),
    });
  } catch (error) {
    logger.error("Error in referral/list route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

