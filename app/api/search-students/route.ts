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
    // Strategy: Get student profiles, then match against user emails
    const searchLower = searchQuery.toLowerCase().trim();
    const supabaseAdmin = getSupabaseAdmin();

    // Get student profiles that match by name
    const { data: studentProfiles, error: profilesError } = await supabase
      .from("student_profiles")
      .select("id, owner_id, name, grade_level, avatar_url")
      .ilike("name", `%${searchLower}%`)
      .limit(50); // Get more to filter by email

    if (profilesError) {
      logger.error("Error searching student profiles", { error: profilesError });
      return NextResponse.json(
        { error: "Failed to search for students" },
        { status: 500 }
      );
    }

    // For each student profile, get user email from auth.users
    const results = await Promise.all(
      (studentProfiles || []).map(async (studentProfile) => {
        // Get user email from auth.users (using admin client)
        let email = "";
        let username = null;
        
        if (supabaseAdmin) {
          try {
            const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(studentProfile.owner_id);
            if (!userError && user) {
              email = user.email || "";
              username = user.user_metadata?.username || null;
            }
          } catch (error) {
            logger.warn("Could not get user email", { userId: studentProfile.owner_id, error });
          }
        }

        return {
          user_id: studentProfile.owner_id,
          email: email,
          username: username,
          student_profile: {
            id: studentProfile.id,
            name: studentProfile.name,
            grade_level: studentProfile.grade_level,
            avatar_url: studentProfile.avatar_url,
          },
        };
      })
    );

    // Filter results by email/username/name match
    const filteredResults = results.filter(result => {
      const emailMatch = result.email.toLowerCase().includes(searchLower);
      const usernameMatch = result.username?.toLowerCase().includes(searchLower);
      const nameMatch = result.student_profile.name.toLowerCase().includes(searchLower);
      return emailMatch || usernameMatch || nameMatch;
    }).slice(0, 10); // Limit to 10 results

    const validResults = filteredResults;

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

