import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * Test endpoint to create a complete user for testing
 * Creates: profile + student_profile + initial XP + initial streak
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, username, role } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // 1. Create profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        username: username || `testuser_${userId.substring(0, 8)}`,
        display_name: username || "Test User",
        role: role || "student",
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ 
        error: "Failed to create profile", 
        details: profileError.message 
      }, { status: 500 });
    }

    // 2. Create student profile (if student)
    let studentProfile = null;
    if (role === "student" || !role) {
      const { data: sp, error: spError } = await supabase
        .from("student_profiles")
        .insert({
          owner_id: userId,
          name: username || "Test Student",
          grade_level: "middle",
        })
        .select()
        .single();

      if (spError) {
        logger.warn("Failed to create student profile", { error: spError });
      } else {
        studentProfile = sp;
      }
    }

    // 3. Create initial XP
    const { data: xp, error: xpError } = await supabase
      .from("xp_data")
      .insert({
        user_id: userId,
        student_profile_id: null,
        total_xp: 0,
        level: 1,
        xp_to_next_level: 100,
        xp_history: [],
      })
      .select()
      .single();

    if (xpError) {
      logger.warn("Failed to create XP", { error: xpError });
    }

    // 4. Create initial streak
    const today = new Date().toISOString().split("T")[0];
    const { data: streak, error: streakError } = await supabase
      .from("streaks")
      .insert({
        user_id: userId,
        student_profile_id: null,
        current_streak: 0,
        longest_streak: 0,
        last_study_date: null,
      })
      .select()
      .single();

    if (streakError) {
      logger.warn("Failed to create streak", { error: streakError });
    }

    return NextResponse.json({
      success: true,
      message: "Test user created successfully",
      data: {
        profile,
        studentProfile,
        xp,
        streak,
      },
    });
  } catch (error) {
    logger.error("Error in POST /api/test/setup-user", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    // Delete profile (cascade will delete everything else)
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Test user deleted (cascade)",
    });
  } catch (error) {
    logger.error("Error in DELETE /api/test/setup-user", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

