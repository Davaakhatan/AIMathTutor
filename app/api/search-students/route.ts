import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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

    // Search for students by name, email, or username
    // Strategy: Search auth.users first (by email/username), then get their student profiles
    const searchLower = searchQuery.toLowerCase().trim();
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      logger.error("Supabase admin client not available for student search");
      return NextResponse.json(
        { error: "Search service unavailable. Please check server configuration." },
        { status: 500 }
      );
    }

    // Step 1: Search auth.users by email (if it looks like an email)
    const isEmailSearch = searchLower.includes("@");
    let matchingUserIds: string[] = [];

    if (isEmailSearch) {
      // Search by email in auth.users
      try {
        // Note: Supabase Admin API doesn't have a direct search, so we'll need to list users
        // For now, we'll search student_profiles and match emails
        // But we'll also try to get user by email if possible
        logger.info("Searching by email", { email: searchLower });
      } catch (error) {
        logger.warn("Error searching by email", { error });
      }
    }

    // Step 2: Get all student profiles (we'll filter them)
    const { data: allStudentProfiles, error: profilesError } = await supabase
      .from("student_profiles")
      .select("id, owner_id, name, grade_level, avatar_url")
      .limit(100); // Get more profiles to search through

    if (profilesError) {
      logger.error("Error fetching student profiles", { error: profilesError });
      return NextResponse.json(
        { error: "Failed to search for students" },
        { status: 500 }
      );
    }

    // Step 3: For each student profile, get user email and match against search query
    const results = await Promise.all(
      (allStudentProfiles || []).map(async (studentProfile) => {
        try {
          // Get user email from auth.users (using admin client)
          const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(studentProfile.owner_id);
          
          if (userError || !user) {
            return null;
          }

          const email = (user.email || "").toLowerCase();
          const username = (user.user_metadata?.username || "").toLowerCase();
          const profileName = (studentProfile.name || "").toLowerCase();

          // Check if search query matches email, username, or profile name
          const emailMatch = email.includes(searchLower);
          const usernameMatch = username && username.includes(searchLower);
          const nameMatch = profileName.includes(searchLower);

          if (!emailMatch && !usernameMatch && !nameMatch) {
            return null; // No match
          }

          return {
            user_id: studentProfile.owner_id,
            email: user.email || "",
            username: user.user_metadata?.username || null,
            student_profile: {
              id: studentProfile.id,
              name: studentProfile.name,
              grade_level: studentProfile.grade_level,
              avatar_url: studentProfile.avatar_url,
            },
          };
        } catch (error) {
          logger.warn("Error processing student profile", { 
            profileId: studentProfile.id, 
            error 
          });
          return null;
        }
      })
    );

    // Filter out null results and limit to 10
    const validResults = results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .slice(0, 10);

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

