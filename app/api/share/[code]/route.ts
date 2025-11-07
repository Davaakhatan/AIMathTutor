import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to get share data by code
 * GET /api/share/[code]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    if (!code) {
      return NextResponse.json(
        { error: "Share code is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("shares")
      .select("*")
      .eq("share_code", code.toUpperCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return NextResponse.json(
          { error: "Share not found" },
          { status: 404 }
        );
      }
      logger.error("Error fetching share by code", { error: error.message, code });
      return NextResponse.json(
        { error: "Failed to fetch share", details: error.message },
        { status: 500 }
      );
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      logger.warn("Share code expired", { code, expiresAt: data.expires_at });
      return NextResponse.json(
        { error: "Share has expired" },
        { status: 410 } // Gone
      );
    }

    return NextResponse.json({
      success: true,
      share: data,
    });
  } catch (error) {
    logger.error("Error in share/[code] route", { error });
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

