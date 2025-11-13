import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to fetch XP data (server-side with admin client)
 * This bypasses client-side authentication issues
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // For now, skip auth check - admin client will be used anyway
    // TODO: Add proper auth verification using request headers
    // The client should send the auth token in the Authorization header

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.warn("Supabase admin client not available");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Build query
    let query = supabase
      .from("xp_data")
      .select("*")
      .eq("user_id", userId);

    if (profileId && profileId !== "null") {
      query = query.eq("student_profile_id", profileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching XP data via API", { error: error.message, userId, profileId });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      logger.debug("No XP data found", { userId, profileId });
      return NextResponse.json({ success: true, xpData: null });
    }

    // Get the latest record if duplicates exist
    const xpRow = data.sort((a: any, b: any) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    })[0];

    // Convert to XPData format
    const xpHistory = (xpRow.xp_history as any) || [];
    const recentGains = xpHistory.map((entry: any) => ({
      xp: entry.xp || 0,
      reason: entry.reason || "XP gained",
      timestamp: entry.date ? new Date(entry.date).getTime() : Date.now()
    }));

    const xpData = {
      total_xp: xpRow.total_xp || 0,
      level: xpRow.level || 1,
      xp_to_next_level: xpRow.xp_to_next_level || 100,
      xp_history: xpHistory,
      recent_gains: recentGains,
    };

    logger.info("XP data fetched via API", { userId, totalXP: xpData.total_xp, level: xpData.level });

    return NextResponse.json({ success: true, xpData });
  } catch (error) {
    logger.error("Error in GET /api/xp", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

