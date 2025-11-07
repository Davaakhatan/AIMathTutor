import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to delete student profile using service role key (bypasses RLS)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log("[API] /api/delete-profile called");
    const body = await request.json();
    const { profileId, userId } = body;

    if (!profileId || !userId) {
      return NextResponse.json(
        { error: "profileId and userId are required" },
        { status: 400 }
      );
    }

    console.log("[API] Deleting profile:", profileId);
    const supabase = getSupabaseServer();

    // Verify profile exists and belongs to user
    const { data: profile, error: checkError } = await supabase
      .from("student_profiles")
      .select("owner_id")
      .eq("id", profileId)
      .single();

    type Profile = { owner_id: string } | null;
    const typedProfile = profile as Profile;

    if (checkError || !typedProfile) {
      console.error("[API] Error checking profile:", checkError?.message);
      return NextResponse.json(
        { error: "Profile not found", details: checkError?.message },
        { status: 404 }
      );
    }

    if (typedProfile.owner_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: Profile does not belong to user" },
        { status: 403 }
      );
    }

    // If this was the active profile, clear it from the user's profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("current_student_profile_id")
      .eq("id", userId)
      .single();

    type UserProfile = { current_student_profile_id: string | null } | null;
    const typedUserProfile = userProfile as UserProfile;

    if (typedUserProfile?.current_student_profile_id === profileId) {
      await (supabase
        .from("profiles") as any)
        .update({ current_student_profile_id: null })
        .eq("id", userId);
    }

    // Delete the profile
    const deleteStart = Date.now();
    const { error: deleteError } = await supabase
      .from("student_profiles")
      .delete()
      .eq("id", profileId);

    const deleteDuration = Date.now() - deleteStart;
    console.log("[API] Profile delete completed in", deleteDuration, "ms");

    if (deleteError) {
      console.error("[API] Error deleting profile:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete profile", details: deleteError.message },
        { status: 500 }
      );
    }

    const totalDuration = Date.now() - startTime;
    console.log("[API] Profile deleted successfully in", totalDuration, "ms");

    return NextResponse.json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error("[API] Error in delete-profile route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

