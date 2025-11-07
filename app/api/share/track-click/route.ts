import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to track a share click
 * POST /api/share/track-click
 */
export async function POST(request: NextRequest) {
  try {
    const { shareCode } = await request.json();

    if (!shareCode) {
      return NextResponse.json(
        { error: "shareCode is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Increment click count using RPC or direct update
    // First, get current count
    const { data: currentShare } = await supabase
      .from("shares")
      .select("click_count")
      .eq("share_code", shareCode.toUpperCase())
      .single();

    type Share = { click_count: number } | null;
    const typedCurrentShare = currentShare as Share;

    if (!typedCurrentShare) {
      return NextResponse.json(
        { error: "Share not found" },
        { status: 404 }
      );
    }

    const { error } = await (supabase
      .from("shares") as any)
      .update({ click_count: (typedCurrentShare.click_count || 0) + 1 })
      .eq("share_code", shareCode.toUpperCase());

    if (error) {
      logger.error("Error tracking share click", { error: error.message, shareCode });
      return NextResponse.json(
        { error: "Failed to track click", details: error.message },
        { status: 500 }
      );
    }

    logger.debug("Share click tracked", { shareCode });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in share/track-click route", { error });
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

