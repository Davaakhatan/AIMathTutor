import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to create student profile using service role key (bypasses RLS)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log("[API] /api/create-profile called");
    const body = await request.json();
    const { userId, name, grade_level, difficulty_preference, avatar_url } = body;

    if (!userId || !name) {
      return NextResponse.json(
        { error: "userId and name are required" },
        { status: 400 }
      );
    }

    console.log("[API] Creating profile for user:", userId);
    const supabase = getSupabaseServer();

    // CRITICAL: Ensure user has a profiles table entry before creating student profile
    // This is required for RLS policies to work correctly
    console.log("[API] Checking if user has profiles table entry...");
    const { data: userProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (profileCheckError && profileCheckError.code !== "PGRST116") {
      console.error("[API] Error checking user profile:", profileCheckError.message);
      return NextResponse.json(
        { error: "Failed to check user profile", details: profileCheckError.message },
        { status: 500 }
      );
    }

    // If profile doesn't exist, create it
    if (!userProfile) {
      console.log("[API] User profile not found, creating one...", { userId });
      const { error: createProfileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          role: "student", // Default to student
        } as any);

      if (createProfileError) {
        // If it's a duplicate key error, that's OK - profile was created between check and insert
        if (createProfileError.code !== "23505") {
          console.error("[API] Error creating user profile:", createProfileError.message);
          return NextResponse.json(
            { error: "Failed to create user profile", details: createProfileError.message },
            { status: 500 }
          );
        }
        console.log("[API] Profile already exists (race condition)");
      } else {
        console.log("[API] User profile created successfully");
      }
    } else {
      type UserProfile = { id: string; role: string };
      const typedUserProfile = userProfile as UserProfile;
      console.log("[API] User profile exists", { role: typedUserProfile.role });
    }

    // Generate profile ID
    const profileId = crypto.randomUUID();

    // Insert the student profile (with timeout)
    const insertStart = Date.now();
    console.log("[API] Inserting student profile...", { profileId, userId, name });
    
    try {
      const { data: newProfile, error: insertError } = await supabase
        .from("student_profiles")
        .insert({
          id: profileId,
          owner_id: userId,
          name,
          avatar_url: avatar_url || null,
          grade_level: grade_level || "middle",
          difficulty_preference: difficulty_preference || "middle",
          timezone: "UTC",
          language: "en",
          settings: {},
          is_active: true,
        } as any)
        .select()
        .single();

      const insertDuration = Date.now() - insertStart;
      console.log("[API] Profile insert completed in", insertDuration, "ms");

      if (insertError) {
        console.error("[API] Error inserting student profile:", insertError);
        return NextResponse.json(
          { error: "Failed to create student profile", details: insertError.message, code: insertError.code },
          { status: 500 }
        );
      }

      if (!newProfile) {
        console.error("[API] Insert succeeded but no profile returned");
        return NextResponse.json(
          { error: "Profile created but not returned from database" },
          { status: 500 }
        );
      }

      type NewProfile = { id: string; [key: string]: any };
      const typedNewProfile = newProfile as NewProfile;

      const totalDuration = Date.now() - startTime;
      console.log("[API] Profile created successfully in", totalDuration, "ms", { profileId: typedNewProfile.id });

      return NextResponse.json({
        success: true,
        profile: typedNewProfile,
      });
    } catch (error: any) {
      const insertDuration = Date.now() - insertStart;
      console.error("[API] Insert operation failed", { error: error.message, duration: insertDuration });
      
      // Check if it's a timeout or network error
      if (error.message?.includes("timeout") || error.message?.includes("aborted")) {
        return NextResponse.json(
          { error: "Database operation timed out. Please check your Supabase connection and try again.", details: error.message },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to create student profile", details: error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error("[API] Error in create-profile route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

