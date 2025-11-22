import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to fetch XP data (server-side with admin client)
 * This bypasses client-side authentication issues
 */
export const dynamic = 'force-dynamic';

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

    // Use server client (service role) for reliable access
    const supabase = getSupabaseServer();
    if (!supabase) {
      logger.warn("Supabase server client not available");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // First, check all records for this user (for debugging)
    const { data: allRecords } = await supabase
      .from("xp_data")
      .select("id, user_id, student_profile_id, total_xp")
      .eq("user_id", userId);

    logger.debug("All XP records for user", {
      userId,
      profileId,
      recordCount: allRecords?.length || 0,
      records: allRecords?.map((r: any) => ({
        id: r.id,
        student_profile_id: r.student_profile_id,
        total_xp: r.total_xp
      })) || []
    });

    // Build query with profile filter
    // Note: For null profileId, we filter the results in-memory since .is("column", null)
    // has inconsistent behavior with Supabase
    const { data: allData, error } = await supabase
      .from("xp_data")
      .select("*")
      .eq("user_id", userId);

    // Filter by student_profile_id
    let data = allData;
    if (profileId && profileId !== "null") {
      data = allData?.filter((r: any) => r.student_profile_id === profileId) || [];
    } else {
      // For null profileId, get records where student_profile_id is null
      data = allData?.filter((r: any) => r.student_profile_id === null) || [];
    }

    logger.debug("XP query result", {
      userId,
      profileId,
      recordCount: data?.length || 0,
      hasError: !!error
    });

    if (error) {
      logger.error("Error fetching XP data via API", { error: error.message, userId, profileId });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      logger.debug("No XP data found, will return default (let updateXPData create if needed)", { userId, profileId });

      // Don't auto-create here - let updateXPData handle creation to avoid duplicates
      // Just return default data
      const initialXPData = {
        total_xp: 0,
        level: 1,
        xp_to_next_level: 100,
        xp_history: [],
        recent_gains: [],
      };

      return NextResponse.json({ success: true, xpData: initialXPData });
    }

    // Get the record with highest XP if duplicates exist
    // This handles the case where multiple records were accidentally created
    const xpRow = (data as any[]).sort((a: any, b: any) => {
      // Primary sort: by total_xp descending (get the one with most XP)
      const xpDiff = (b.total_xp || 0) - (a.total_xp || 0);
      if (xpDiff !== 0) return xpDiff;
      // Secondary sort: by updated_at descending (most recent if same XP)
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    })[0] as any;

    // Convert to XPData format
    const xpHistory = (xpRow?.xp_history as any) || [];
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

    const xpData = {
      total_xp: (xpRow?.total_xp as number) || 0,
      level: (xpRow?.level as number) || 1,
      xp_to_next_level: (xpRow?.xp_to_next_level as number) || 100,
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

