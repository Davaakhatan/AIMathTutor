import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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

    type Profile = { id: string; role: string; current_student_profile_id?: string | null; [key: string]: any } | null;
    let typedProfile = profile as Profile;

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[API] Error fetching user profile:", profileError.message);
      return NextResponse.json(
        { error: "Failed to fetch user profile", details: profileError.message },
        { status: 500 }
      );
    }

    // If profile doesn't exist, create it (should have been created by trigger on signup)
    if (!typedProfile) {
      console.log("[API] User profile not found, creating one...", { userId });
      try {
        // Try to get role from user metadata
        let userRole: "student" | "parent" | "teacher" | "admin" = "student";
        try {
          const supabaseAdmin = getSupabaseAdmin();
          if (supabaseAdmin) {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (user?.user_metadata?.role) {
              const metadataRole = user.user_metadata.role;
              if (["student", "parent", "teacher", "admin"].includes(metadataRole)) {
                userRole = metadataRole as any;
                console.log("[API] Using role from user metadata", { userId, role: userRole });
              }
            }
          }
        } catch (e) {
          // If we can't get user metadata, default to student
          console.log("[API] Could not get user metadata, defaulting to student", { userId });
        }
        
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            role: userRole,
          } as any)
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
            typedProfile = fetchedProfile as Profile;
            console.log("[API] Profile fetched after race condition", { userId, role: typedProfile?.role });
          } else {
            return NextResponse.json(
              { error: "Failed to create user profile", details: createError.message, code: createError.code },
              { status: 500 }
            );
          }
        } else {
          typedProfile = newProfile as Profile;
          console.log("[API] User profile created successfully", { userId, role: typedProfile?.role });
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
    if (!typedProfile) {
      console.warn("[API] Could not create or fetch user profile", { userId });
      return NextResponse.json({
        success: true,
        profiles: [],
        activeProfileId: null,
        userRole: null,
      });
    }

    // Get student profiles based on role
    type StudentProfile = { id: string; name: string; [key: string]: any };
    let studentProfiles: StudentProfile[] = [];
    
    if (typedProfile && typedProfile.role === "student") {
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

      studentProfiles = (data as StudentProfile[]) || [];
      console.log("[API] Found student profiles", { count: studentProfiles.length, profileIds: studentProfiles.map(p => p.id) });
      
      // AUTO-CREATE student profile if none exists
      if (studentProfiles.length === 0) {
        console.log("[API] No student profile found, creating default student profile", { userId });
        const defaultName = typedProfile.full_name || "Student";
        const { data: newProfile, error: createError } = await supabase
          .from("student_profiles")
          .insert({
            owner_id: userId,
            name: defaultName,
            grade_level: null,
          })
          .select()
          .single();

        if (createError) {
          console.error("[API] Error creating default student profile:", createError.message);
        } else if (newProfile) {
          studentProfiles = [newProfile as StudentProfile];
          console.log("[API] Created default student profile", { profileId: newProfile.id, name: defaultName });
        }
      }
    } else {
      // Parents/Teachers get linked profiles via profile_relationships
      const { data: relationships, error: relError } = await supabase
        .from("profile_relationships")
        .select("student_profile_id")
        .eq("parent_id", userId);

      type Relationship = { student_profile_id: string };
      const typedRelationships = relationships as Relationship[] | null;

      if (relError) {
        console.error("[API] Error fetching relationships:", relError.message);
        return NextResponse.json(
          { error: "Failed to fetch relationships", details: relError.message },
          { status: 500 }
        );
      }

      if (typedRelationships && typedRelationships.length > 0) {
        const profileIds = typedRelationships.map(r => r.student_profile_id);
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

        studentProfiles = (data as StudentProfile[]) || [];
      }
    }

    // Get active profile ID
    // For students: default to their first profile if none selected
    // For parents/teachers: default to null (Personal view) - they must explicitly select a student
    let activeProfileId: string | null = null;
    if (typedProfile && typedProfile.role === "student") {
      activeProfileId = typedProfile.current_student_profile_id || 
        (studentProfiles.length > 0 ? studentProfiles[0].id : null);
    } else if (typedProfile) {
      // Parents/teachers: use current_student_profile_id if set AND it exists in linked profiles
      // Otherwise, default to null (Personal view)
      if (typedProfile.current_student_profile_id) {
        // Validate that the active profile ID exists in the linked profiles
        const profileExists = studentProfiles.some(p => p.id === typedProfile.current_student_profile_id);
        if (profileExists) {
          activeProfileId = typedProfile.current_student_profile_id;
        } else {
          // Invalid activeProfileId - reset to null
          console.log("[API] Invalid activeProfileId for parent/teacher, resetting to null", {
            activeProfileId: typedProfile.current_student_profile_id,
            linkedProfileIds: studentProfiles.map(p => p.id),
            userId
          });
          activeProfileId = null;
          // Update database to clear invalid activeProfileId (in background, don't wait)
          (supabase
            .from("profiles") as any)
            .update({ current_student_profile_id: null })
            .eq("id", userId)
            .then((result: { error?: any }) => {
              if (result.error) {
                console.error("[API] Error clearing invalid activeProfileId", { error: result.error.message });
              } else {
                console.log("[API] Cleared invalid activeProfileId in database");
              }
            });
        }
      } else {
        // No activeProfileId set - default to null (Personal view)
        activeProfileId = null;
      }
    }

    console.log("[API] Returning profiles:", {
      count: studentProfiles.length,
      activeProfileId,
      userRole: typedProfile?.role,
      userId,
      profileNames: studentProfiles.map(p => p.name),
      hasProfileEntry: !!typedProfile,
      profileCreated: typedProfile ? "existing" : "new",
    });
    
    // Log warning if no profiles found for a student user (might indicate an issue)
    if (typedProfile && typedProfile.role === "student" && studentProfiles.length === 0) {
      console.warn("[API] No student profiles found for student user", { 
        userId, 
        userRole: typedProfile.role,
        note: "This is normal if user hasn't created any profiles yet"
      });
    }

    // For parents/teachers: No profiles is normal if they haven't linked any students yet
    if (typedProfile && (typedProfile.role === "parent" || typedProfile.role === "teacher") && studentProfiles.length === 0) {
      console.log("[API] No linked students found for parent/teacher", { 
        userId, 
        userRole: typedProfile.role,
        note: "This is normal - parents/teachers link to student accounts via profile_relationships"
      });
    }

    return NextResponse.json({
      success: true,
      profiles: studentProfiles,
      activeProfileId,
      userRole: typedProfile?.role || null,
    });
  } catch (error) {
    console.error("[API] Error in get-profiles route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

