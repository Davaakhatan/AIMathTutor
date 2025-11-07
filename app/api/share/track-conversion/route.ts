import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to track a share conversion (signup from share link)
 * POST /api/share/track-conversion
 */
export async function POST(request: NextRequest) {
  try {
    const { shareCode, newUserId } = await request.json();

    if (!shareCode) {
      return NextResponse.json(
        { error: "shareCode is required" },
        { status: 400 }
      );
    }

    // newUserId is optional - can track micro-task completion without signup

    const supabase = getSupabaseServer();

    // Increment conversion count
    // First, get current count
    const { data: currentShare } = await supabase
      .from("shares")
      .select("conversion_count")
      .eq("share_code", shareCode.toUpperCase())
      .single();

    if (!currentShare) {
      return NextResponse.json(
        { error: "Share not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("shares")
      .update({ conversion_count: (currentShare.conversion_count || 0) + 1 })
      .eq("share_code", shareCode.toUpperCase());

    if (error) {
      logger.error("Error tracking share conversion", { error: error.message, shareCode });
      return NextResponse.json(
        { error: "Failed to track conversion", details: error.message },
        { status: 500 }
      );
    }

    logger.info("Share conversion tracked", { shareCode, newUserId: newUserId || "micro-task completion" });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in share/track-conversion route", { error });
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

