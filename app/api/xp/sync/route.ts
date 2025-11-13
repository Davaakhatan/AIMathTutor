import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to manually sync XP to localStorage (for debugging)
 * This endpoint returns XP data that can be used to update localStorage
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Build query - same as /api/xp route
    let query = (supabase as any)
      .from("xp_data")
      .select("*")
      .eq("user_id", userId)
      .is("student_profile_id", null);

    const { data: queryData, error } = await query;
    
    if (error) {
      logger.error("Error fetching XP for sync", { error: error.message, userId });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!queryData || queryData.length === 0) {
      return NextResponse.json({ success: true, xpData: null, message: "No XP data found" });
    }

    // Get the latest record if duplicates exist (same logic as /api/xp)
    const data = queryData.sort((a: any, b: any) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    })[0];

    // Convert to localStorage format
    const xpHistory = (data.xp_history as any) || [];
    const recentGains = xpHistory
      .map((entry: any) => {
        // Handle timestamp - it might be a number, string, or need to be calculated from date
        let timestamp: number;
        if (entry.timestamp) {
          // If timestamp exists, use it (convert to number if it's a string, floor if decimal)
          timestamp = typeof entry.timestamp === 'string' ? parseInt(entry.timestamp) : Math.floor(entry.timestamp);
        } else if (entry.date) {
          // If no timestamp but has date, convert date to timestamp
          timestamp = new Date(entry.date).getTime();
        } else {
          // Fallback to current time
          timestamp = Date.now();
        }
        
        return {
          xp: entry.xp || 0,
          reason: entry.reason || "XP gained",
          timestamp: timestamp
        };
      })
      .sort((a: any, b: any) => b.timestamp - a.timestamp) // Sort by timestamp descending (most recent first)
      .slice(0, 10); // Limit to 10 most recent entries
    
    const localStorageData = {
      totalXP: data.total_xp || 0,
      level: data.level || 1,
      xpToNextLevel: data.xp_to_next_level || 100,
      xpHistory: xpHistory,
      recentGains: recentGains,
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

