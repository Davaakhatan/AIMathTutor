/**
 * Linked Students API - Get linked student profiles for parent/teacher
 * Uses server-side Supabase to bypass RLS restrictions
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

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

    // Fetch relationships for this parent/teacher
    const { data: relationships, error: relError } = await supabase
      .from("profile_relationships")
      .select("*")
      .eq("parent_id", userId)
      .order("created_at", { ascending: false });

    if (relError) {
      logger.error("Error fetching relationships", { error: relError.message });
      return NextResponse.json(
        { success: false, error: relError.message },
        { status: 500 }
      );
    }

    if (!relationships || relationships.length === 0) {
      return NextResponse.json({
        success: true,
        students: [],
      });
    }

    // Extract profile IDs
    const profileIds = relationships
      .map((rel) => rel.student_profile_id)
      .filter((id) => id !== null);

    if (profileIds.length === 0) {
      return NextResponse.json({
        success: true,
        students: [],
      });
    }

    // Fetch student profiles (server-side bypasses RLS)
    const { data: studentProfiles, error: profilesError } = await supabase
      .from("student_profiles")
      .select("id, owner_id, name, avatar_url, grade_level, difficulty_preference")
      .in("id", profileIds);

    if (profilesError) {
      logger.error("Error fetching student profiles", { error: profilesError.message });
      return NextResponse.json(
        { success: false, error: profilesError.message },
        { status: 500 }
      );
    }

    // Create a map for quick lookup
    const profilesMap = new Map(
      (studentProfiles || []).map((p) => [p.id, p])
    );

    // Combine relationships with profiles
    const students = relationships
      .map((rel) => {
        const profile = profilesMap.get(rel.student_profile_id);
        if (!profile) return null;

        return {
          relationship: {
            id: rel.id,
            parent_id: rel.parent_id,
            student_profile_id: rel.student_profile_id,
            relationship_type: rel.relationship_type,
            can_view_progress: rel.can_view_progress,
            can_manage_profile: rel.can_manage_profile,
            created_at: rel.created_at,
            updated_at: rel.updated_at,
          },
          student_profile: {
            id: profile.id,
            owner_id: profile.owner_id,
            name: profile.name,
            avatar_url: profile.avatar_url,
            grade_level: profile.grade_level,
            difficulty_preference: profile.difficulty_preference,
          },
        };
      })
      .filter((item) => item !== null);

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error) {
    logger.error("Error in linked-students API", { error });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
