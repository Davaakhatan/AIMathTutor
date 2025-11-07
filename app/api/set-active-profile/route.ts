import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to set active student profile using service role key (bypasses RLS)
 */
export async function POST(request: NextRequest) {
  try {
    const { profileId, userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // If profileId is provided, verify it exists and user has access
    if (profileId) {
      // Get user's role
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!userProfile) {
        return NextResponse.json(
          { error: "User profile not found" },
          { status: 404 }
        );
      }

      // For students: verify they own the profile
      if (userProfile.role === "student") {
        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("id", profileId)
          .eq("owner_id", userId)
          .single();

        if (!studentProfile) {
          return NextResponse.json(
            { error: "Student profile not found or access denied" },
            { status: 403 }
          );
        }
      } else {
        // For parents/teachers: verify they have a relationship
        const { data: relationship } = await supabase
          .from("profile_relationships")
          .select("student_profile_id")
          .eq("parent_id", userId)
          .eq("student_profile_id", profileId)
          .single();

        if (!relationship) {
          return NextResponse.json(
            { error: "Student profile not found or access denied" },
            { status: 403 }
          );
        }
      }
    }

    // Update the active profile
    const { error } = await supabase
      .from("profiles")
      .update({ current_student_profile_id: profileId })
      .eq("id", userId);

    if (error) {
      logger.error("Error setting active student profile", { error: error.message, profileId, userId });
      return NextResponse.json(
        { error: "Failed to set active profile", details: error.message },
        { status: 500 }
      );
    }

    logger.info("Active student profile updated via API", { profileId, userId });

    return NextResponse.json({
      success: true,
      message: "Active profile updated successfully",
    });
  } catch (error) {
    logger.error("Error in set-active-profile API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

