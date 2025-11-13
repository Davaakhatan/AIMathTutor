import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * GET /api/streak
 * Fetch streak data for the current user
 * Server-side route that bypasses RLS
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.debug("Fetching streak data via API", { userId, effectiveProfileId });

    // Query streaks table
    let query = (supabase as any)
      .from("streaks")
      .select("*")
      .eq("user_id", userId);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching streak data via API", {
        error: error.message,
        userId,
        effectiveProfileId,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // If no data, return default
    if (!data || data.length === 0) {
      logger.debug("No streak data found, returning default", { userId, effectiveProfileId });
      return NextResponse.json({
        success: true,
        streakData: {
          current_streak: 0,
          longest_streak: 0,
          last_study_date: null,
        },
      });
    }

    const streakRow = data[0];
    const streakData = {
      current_streak: streakRow.current_streak || 0,
      longest_streak: streakRow.longest_streak || 0,
      last_study_date: streakRow.last_study_date || null,
    };

    logger.debug("Streak data fetched via API", {
      userId,
      effectiveProfileId,
      currentStreak: streakData.current_streak,
    });

    return NextResponse.json({ success: true, streakData });
  } catch (error) {
    logger.error("Exception fetching streak data via API", { error });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

