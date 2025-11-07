import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * Search for students by email or username
 * Used by parents/teachers to find students to link to
 */
export async function POST(request: NextRequest) {
  try {
    const { searchQuery, userId } = await request.json();

    if (!searchQuery || typeof searchQuery !== "string" || searchQuery.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Verify user is parent or teacher
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile || (profile.role !== "parent" && profile.role !== "teacher")) {
      return NextResponse.json(
        { error: "Only parents and teachers can search for students" },
        { status: 403 }
      );
    }

    // Search for students by email (case-insensitive partial match)
    const searchLower = searchQuery.toLowerCase().trim();

    // First, search in auth.users by email
    // Note: We can't directly query auth.users, so we'll search profiles table
    // which has user_id that matches auth.users.id
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, username")
      .eq("role", "student")
      .or(`email.ilike.%${searchLower}%,username.ilike.%${searchLower}%`)
      .limit(10);

    if (profilesError) {
      logger.error("Error searching profiles", { error: profilesError });
      return NextResponse.json(
        { error: "Failed to search for students" },
        { status: 500 }
      );
    }

    // For each profile, get the student profile
    const results = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("id, name, grade_level, avatar_url")
          .eq("owner_id", profile.id)
          .single();

        return {
          user_id: profile.id,
          email: profile.email,
          username: profile.username,
          student_profile: studentProfile ? {
            id: studentProfile.id,
            name: studentProfile.name,
            grade_level: studentProfile.grade_level,
            avatar_url: studentProfile.avatar_url,
          } : null,
        };
      })
    );

    // Filter out students without profiles (shouldn't happen, but just in case)
    const validResults = results.filter(r => r.student_profile !== null);

    logger.info("Student search completed", {
      query: searchQuery,
      resultsCount: validResults.length,
      userId: userId,
    });

    return NextResponse.json({
      success: true,
      results: validResults,
    });
  } catch (error) {
    logger.error("Error in search-students API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

