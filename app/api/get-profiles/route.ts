import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to get student profiles using service role key (bypasses RLS)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    console.log("[API] /api/get-profiles called for userId:", userId);
    const supabase = getSupabaseServer();

    // Get user's profile to check role
    // If it doesn't exist, create it (should have been created by trigger, but just in case)
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[API] Error fetching user profile:", profileError.message);
      return NextResponse.json(
        { error: "Failed to fetch user profile", details: profileError.message },
        { status: 500 }
      );
    }

    // If profile doesn't exist, create it (should have been created by trigger on signup)
    if (!profile) {
      console.log("[API] User profile not found, creating one...", { userId });
      try {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            role: "student", // Default to student
          })
          .select()
          .single();

        if (createError) {
          console.error("[API] Error creating user profile:", createError.message, createError.code);
          // If it's a duplicate key error, try fetching again (race condition)
          if (createError.code === "23505") {
            console.log("[API] Profile already exists (race condition), fetching...");
            const { data: fetchedProfile, error: fetchError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .single();
            
            if (fetchError) {
              console.error("[API] Error fetching profile after duplicate key:", fetchError.message);
              return NextResponse.json(
                { error: "Failed to fetch user profile after creation", details: fetchError.message },
                { status: 500 }
              );
            }
            profile = fetchedProfile;
            console.log("[API] Profile fetched after race condition", { userId, role: profile?.role });
          } else {
            return NextResponse.json(
              { error: "Failed to create user profile", details: createError.message, code: createError.code },
              { status: 500 }
            );
          }
        } else {
          profile = newProfile;
          console.log("[API] User profile created successfully", { userId, role: profile.role });
        }
      } catch (error: any) {
        console.error("[API] Exception creating user profile:", error);
        return NextResponse.json(
          { error: "Failed to create user profile", details: error.message },
          { status: 500 }
        );
      }
    }

    // If still no profile after creation attempt, return empty
    if (!profile) {
      console.warn("[API] Could not create or fetch user profile", { userId });
      return NextResponse.json({
        success: true,
        profiles: [],
        activeProfileId: null,
        userRole: null,
      });
    }

    // Get student profiles based on role
    let studentProfiles = [];
    
    if (profile.role === "student") {
      // Students get their own profiles
      console.log("[API] Fetching student profiles for student user", { userId, owner_id: userId });
      const { data, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[API] Error fetching student profiles:", error.message, error);
        return NextResponse.json(
          { error: "Failed to fetch student profiles", details: error.message },
          { status: 500 }
        );
      }

      studentProfiles = data || [];
      console.log("[API] Found student profiles", { count: studentProfiles.length, profileIds: studentProfiles.map(p => p.id) });
    } else {
      // Parents/Teachers get linked profiles via profile_relationships
      const { data: relationships, error: relError } = await supabase
        .from("profile_relationships")
        .select("student_profile_id")
        .eq("parent_id", userId);

      if (relError) {
        console.error("[API] Error fetching relationships:", relError.message);
        return NextResponse.json(
          { error: "Failed to fetch relationships", details: relError.message },
          { status: 500 }
        );
      }

      if (relationships && relationships.length > 0) {
        const profileIds = relationships.map(r => r.student_profile_id);
        const { data, error } = await supabase
          .from("student_profiles")
          .select("*")
          .in("id", profileIds)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("[API] Error fetching linked profiles:", error.message);
          return NextResponse.json(
            { error: "Failed to fetch linked profiles", details: error.message },
            { status: 500 }
          );
        }

        studentProfiles = data || [];
      }
    }

    // Get active profile ID
    const activeProfileId = profile.current_student_profile_id || 
      (studentProfiles.length > 0 ? studentProfiles[0].id : null);

    console.log("[API] Returning profiles:", {
      count: studentProfiles.length,
      activeProfileId,
      userRole: profile.role,
      userId,
      profileNames: studentProfiles.map(p => p.name),
      hasProfileEntry: !!profile,
      profileCreated: profile ? "existing" : "new",
    });
    
    // Log warning if no profiles found for a student user (might indicate an issue)
    if (profile.role === "student" && studentProfiles.length === 0) {
      console.warn("[API] No student profiles found for student user", { 
        userId, 
        userRole: profile.role,
        note: "This is normal if user hasn't created any profiles yet"
      });
    }

    return NextResponse.json({
      success: true,
      profiles: studentProfiles,
      activeProfileId,
      userRole: profile.role,
    });
  } catch (error) {
    console.error("[API] Error in get-profiles route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

