import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to update student profile using service role key (bypasses RLS)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log("[API] /api/update-profile called");
    const body = await request.json();
    const { profileId, userId, ...updateData } = body;

    if (!profileId || !userId) {
      return NextResponse.json(
        { error: "profileId and userId are required" },
        { status: 400 }
      );
    }

    console.log("[API] Updating profile:", profileId);
    const supabase = getSupabaseServer();

    // Verify profile exists and belongs to user
    const { data: profile, error: checkError } = await supabase
      .from("student_profiles")
      .select("owner_id")
      .eq("id", profileId)
      .single();

    if (checkError) {
      console.error("[API] Error checking profile:", checkError.message);
      return NextResponse.json(
        { error: "Profile not found", details: checkError.message },
        { status: 404 }
      );
    }

    if (profile.owner_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: Profile does not belong to user" },
        { status: 403 }
      );
    }

    // Update the profile
    const updateStart = Date.now();
    const { data: updatedProfile, error: updateError } = await supabase
      .from("student_profiles")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .select()
      .single();

    const updateDuration = Date.now() - updateStart;
    console.log("[API] Profile update completed in", updateDuration, "ms");

    if (updateError) {
      console.error("[API] Error updating profile:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update profile", details: updateError.message },
        { status: 500 }
      );
    }

    const totalDuration = Date.now() - startTime;
    console.log("[API] Profile updated successfully in", totalDuration, "ms");

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error("[API] Error in update-profile route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

