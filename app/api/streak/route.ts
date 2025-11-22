import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * GET /api/streak
 * Fetch streak data for the current user
 * Server-side route that bypasses RLS
 */
export const dynamic = 'force-dynamic';

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
    // Note: .is("column", null) has inconsistent behavior, use in-memory filtering instead
    const { data: allData, error } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", userId);

    // Filter by student_profile_id
    let data = allData;
    if (effectiveProfileId) {
      data = allData?.filter((r: any) => r.student_profile_id === effectiveProfileId) || [];
    } else {
      data = allData?.filter((r: any) => r.student_profile_id === null) || [];
    }

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

    // If no data, create initial record
    if (!data || data.length === 0) {
      logger.debug("No streak data found, creating initial record", { userId, effectiveProfileId });

      // CRITICAL: Ensure user has a profile entry before inserting streak data
      // streaks has foreign key constraint: user_id REFERENCES profiles(id)
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (profileCheckError && profileCheckError.code !== "PGRST116") {
        logger.error("Error checking profile for streak", { error: profileCheckError.message, userId });
      }

      if (!existingProfile) {
        logger.info("Creating profile for streak", { userId });
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            role: "student",
          });

        if (createProfileError && createProfileError.code !== "23505") {
          logger.error("Failed to create profile for streak", { error: createProfileError.message, userId, code: createProfileError.code });
          // Still return default data even if profile creation fails
          return NextResponse.json({
            success: true,
            streakData: {
              current_streak: 0,
              longest_streak: 0,
              last_study_date: null,
            },
          });
        }
        logger.info("Profile created for streak", { userId });
      }

      // Auto-create initial streak record for this user
      const { error: insertError } = await (supabase as any)
        .from("streaks")
        .insert({
          user_id: userId,
          student_profile_id: effectiveProfileId,
          current_streak: 0,
          longest_streak: 0,
          last_study_date: null,
        });

      if (insertError) {
        logger.error("Failed to create initial streak record", { error: insertError.message, userId });
      } else {
        logger.info("Created initial streak record", { userId, effectiveProfileId });
      }

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

