import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * API route to manually sync XP to localStorage (for debugging)
 * This endpoint returns XP data that can be used to update localStorage
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("xp_data")
      .select("*")
      .eq("user_id", userId)
      .is("student_profile_id", null)
      .maybeSingle();

    if (error) {
      logger.error("Error fetching XP for sync", { error: error.message, userId });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: true, xpData: null, message: "No XP data found" });
    }

    // Convert to localStorage format
    const xpHistory = (data.xp_history as any) || [];
    const localStorageData = {
      totalXP: data.total_xp || 0,
      level: data.level || 1,
      xpToNextLevel: data.xp_to_next_level || 100,
      xpHistory: xpHistory,
      recentGains: xpHistory.map((entry: any) => ({
        xp: entry.xp || 0,
        reason: entry.reason || "XP gained",
        timestamp: entry.date ? new Date(entry.date).getTime() : Date.now()
      })),
    };

    logger.info("XP sync data prepared", { userId, totalXP: localStorageData.totalXP, level: localStorageData.level });

    return NextResponse.json({ 
      success: true, 
      xpData: localStorageData,
      instructions: "Use this data to update localStorage with key 'aitutor-xp'"
    });
  } catch (error) {
    logger.error("Error in GET /api/xp/sync", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

