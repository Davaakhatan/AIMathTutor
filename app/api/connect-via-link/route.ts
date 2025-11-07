import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * Connect parent/teacher to student via link code
 * Link format: /connect/{student_profile_id} or code-based
 */
export async function POST(request: NextRequest) {
  try {
    const { linkCode, userId } = await request.json();

    if (!linkCode || !userId) {
      return NextResponse.json(
        { error: "Link code and user ID are required" },
        { status: 400 }
      );
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
        { error: "Only parents and teachers can connect to students" },
        { status: 403 }
      );
    }

    // Extract student_profile_id from link code
    // Link code can be:
    // 1. Full URL: /connect/{student_profile_id} or http://.../connect/{student_profile_id}
    // 2. Just the profile ID
    let studentProfileId: string;
    
    try {
      // If it's a URL, extract the ID from the path
      if (linkCode.includes("/connect/")) {
        const match = linkCode.match(/\/connect\/([a-f0-9-]+)/i);
        if (match && match[1]) {
          studentProfileId = match[1];
        } else {
          throw new Error("Invalid link format");
        }
      } else {
        // Assume it's just the profile ID
        studentProfileId = linkCode.trim();
      }

      // Validate it looks like a UUID
      if (!/^[a-f0-9-]{36}$/i.test(studentProfileId)) {
        throw new Error("Invalid link code format");
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid link code format. Please check the code and try again." },
        { status: 400 }
      );
    }

    // Verify the student profile exists
    const { data: studentProfile, error: profileError } = await supabase
      .from("student_profiles")
      .select("id, owner_id, name")
      .eq("id", studentProfileId)
      .single();

    if (profileError || !studentProfile) {
      return NextResponse.json(
        { error: "Student profile not found. Please check the link code." },
        { status: 404 }
      );
    }

    // Check if relationship already exists
    const { data: existingRels, error: relCheckError } = await supabase
      .from("profile_relationships")
      .select("id")
      .eq("parent_id", userId)
      .eq("student_profile_id", studentProfileId)
      .limit(1);

    if (relCheckError && relCheckError.code !== "PGRST116") {
      logger.error("Error checking existing relationship", { error: relCheckError });
      // Continue anyway - might be a permission issue, but we'll try to create
    }

    if (existingRels && existingRels.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Already connected to this student",
        relationshipId: existingRels[0].id,
        studentProfile: {
          id: studentProfile.id,
          name: studentProfile.name,
        },
      });
    }

    // Create the relationship
    const { data: newRelationship, error: createError } = await supabase
      .from("profile_relationships")
      .insert({
        parent_id: userId,
        student_profile_id: studentProfileId,
        relationship_type: profile.role === "teacher" ? "teacher" : "parent",
        can_view_progress: true,
        can_manage_profile: false, // Default to view-only
      })
      .select()
      .single();

    if (createError) {
      logger.error("Error creating relationship", { 
        error: createError,
        errorCode: createError.code,
        errorMessage: createError.message,
        errorDetails: createError.details,
        errorHint: createError.hint,
        userId,
        studentProfileId,
      });
      
      // Provide more specific error messages
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "You are already connected to this student." },
          { status: 409 }
        );
      }
      
      if (createError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid student profile. Please check the connection code." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: "Failed to connect to student. Please try again.",
          details: createError.message 
        },
        { status: 500 }
      );
    }

    logger.info("Parent connected to student via link", {
      parentId: userId,
      studentProfileId,
      relationshipId: newRelationship.id,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully connected to ${studentProfile.name}`,
      relationshipId: newRelationship.id,
      studentProfile: {
        id: studentProfile.id,
        name: studentProfile.name,
      },
    });
  } catch (error) {
    logger.error("Error in connect-via-link API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

