import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * Get all relationships for a student profile (who can view/manage it)
 * Uses service role key to bypass RLS
 */
export async function POST(request: NextRequest) {
  try {
    const { studentProfileId, userId } = await request.json();

    if (!studentProfileId || !userId) {
      return NextResponse.json(
        { error: "Student profile ID and user ID are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Verify the student profile belongs to the current user
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("owner_id")
      .eq("id", studentProfileId)
      .single();

    type Profile = { owner_id: string } | null;
    const typedProfile = profile as Profile;

    if (profileError || !typedProfile) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    if (typedProfile.owner_id !== userId) {
      return NextResponse.json(
        { error: "Access denied - profile does not belong to user" },
        { status: 403 }
      );
    }

    // Get all relationships for this student profile
    const { data: relationships, error: relError } = await supabase
      .from("profile_relationships")
      .select("*")
      .eq("student_profile_id", studentProfileId)
      .order("created_at", { ascending: false });

    if (relError) {
      logger.error("Error fetching student relationships", { 
        error: relError.message, 
        studentProfileId 
      });
      return NextResponse.json(
        { error: "Failed to fetch relationships", details: relError.message },
        { status: 500 }
      );
    }

    logger.info("Student relationships fetched", {
      studentProfileId,
      count: relationships?.length || 0,
      userId,
    });

    return NextResponse.json({
      success: true,
      relationships: relationships || [],
    });
  } catch (error) {
    logger.error("Error in get-student-relationships API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

