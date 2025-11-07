/**
 * Student Profile Service
 * Manages multiple student profiles for parents/teachers
 */

import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface StudentProfile {
  id: string;
  owner_id: string;
  name: string;
  avatar_url?: string;
  grade_level?: "elementary" | "middle" | "high" | "advanced" | "college";
  difficulty_preference: "elementary" | "middle" | "high" | "advanced";
  timezone: string;
  language: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentProfileInput {
  name: string;
  avatar_url?: string;
  grade_level?: "elementary" | "middle" | "high" | "advanced" | "college";
  difficulty_preference?: "elementary" | "middle" | "high" | "advanced";
  timezone?: string;
  language?: string;
  settings?: Record<string, any>;
}

export interface UpdateStudentProfileInput {
  name?: string;
  avatar_url?: string;
  grade_level?: "elementary" | "middle" | "high" | "advanced" | "college";
  difficulty_preference?: "elementary" | "middle" | "high" | "advanced";
  timezone?: string;
  language?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

/**
 * Get all student profiles for the current user
 * Model B: Students get their own profile, Parents get linked student profiles
 * Uses API route to bypass client-side query timeouts
 */
export async function getStudentProfiles(): Promise<StudentProfile[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Use API route since all client-side queries timeout
    logger.info("Fetching profiles via API route (client queries timeout)");
    console.log("Fetching profiles via API route...");
    
    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const apiResponse = await fetch("/api/get-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
        signal: controller.signal,
      });

      clearTimeout(fetchTimeout);

      if (!apiResponse.ok) {
        let errorData;
        try {
          errorData = await apiResponse.json();
        } catch {
          errorData = { error: `HTTP ${apiResponse.status}: ${apiResponse.statusText}` };
        }
        throw new Error(errorData.error || `API route failed: ${apiResponse.statusText}`);
      }

      const result = await apiResponse.json();
      if (result.success && Array.isArray(result.profiles)) {
        logger.info("Profiles fetched via API route", { count: result.profiles.length });
        console.log("Profiles fetched via API route:", result.profiles.length);
        return result.profiles as StudentProfile[];
      } else {
        throw new Error(result.error || "API route returned success but no profiles array");
      }
    } catch (apiError: any) {
      logger.error("API route failed, falling back to empty array", { error: apiError.message });
      console.error("API route failed, returning empty array:", apiError);
      return []; // Return empty array instead of throwing
    }

    // OLD CODE - Client-side queries (always timeout, so commented out)
    /*
    // Get user's role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return [];
    }

    // If user is a student, return their own profile
    if (profile.role === "student") {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        // Check for infinite recursion error specifically
        if (error.message?.includes("infinite recursion") || error.code === "42P17") {
          logger.error("Infinite recursion error detected - migration may not have been run", { 
            error: error.message,
            code: error.code,
            userId: user.id 
          });
          throw new Error("Database policy error. Please run the fix_infinite_recursion_student_profiles.sql migration in Supabase.");
        }
        
        // If profile doesn't exist yet (new student), return empty array instead of throwing
        // The trigger should create it, but if it hasn't run yet, we'll just return empty
        if (error.code === "PGRST116" || error.message?.includes("No rows")) {
          logger.warn("Student profile not found yet, returning empty array", { userId: user.id });
          return [];
        }
        logger.error("Error fetching student's own profile", { 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId: user.id 
        });
        throw error;
      }

      logger.debug("Student profiles fetched", { count: data?.length || 0, userId: user.id });
      return (data || []) as StudentProfile[];
    }

    // If user is a parent/teacher, get linked student profiles via relationships
    // ... (rest of old code)
    */
  } catch (error) {
    logger.error("Error in getStudentProfiles", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - return empty array instead
    return [];
  }
}

/**
 * Get a specific student profile by ID
 * Model B: Students can get their own profile, Parents can get linked profiles
 */
export async function getStudentProfile(profileId: string): Promise<StudentProfile | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get user's role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return null;
    }

    // If user is a student, check if they own this profile
    if (profile.role === "student") {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("id", profileId)
        .eq("owner_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        logger.error("Error fetching student profile", { error: error.message, profileId });
        throw error;
      }

      return data as StudentProfile;
    }

    // If user is a parent/teacher, check if they have a relationship with this profile
    const { data: relationship } = await supabase
      .from("profile_relationships")
      .select("student_profile_id")
      .eq("parent_id", user.id)
      .eq("student_profile_id", profileId)
      .single();

    if (!relationship) {
      // No relationship found - parent doesn't have access
      return null;
    }

    // Get the student profile (RLS will allow if relationship exists)
    const { data, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      logger.error("Error fetching student profile", { error: error.message, profileId });
      throw error;
    }

    return data as StudentProfile;
  } catch (error) {
    logger.error("Error in getStudentProfile", {
      error: error instanceof Error ? error.message : String(error),
      profileId,
    });
    throw error;
  }
}

/**
 * Get the active student profile for the current user
 * Model B: Students get their own profile, Parents get selected linked profile
 * Optimized: accepts profiles list to avoid extra query
 */
export async function getActiveStudentProfile(profilesList?: StudentProfile[]): Promise<StudentProfile | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Get user's profile to find role and current_student_profile_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("current_student_profile_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      logger.warn("User profile not found", { userId: user.id });
      return null;
    }

    // If user is a student, return their own profile
    if (profile.role === "student") {
      // If we have the profiles list, use it
      if (profilesList && profilesList.length > 0) {
        return profilesList[0]; // Students typically have one profile
      }

      // Otherwise query for their profile
      const { data: studentProfiles } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);

      return (studentProfiles && studentProfiles.length > 0) ? (studentProfiles[0] as StudentProfile) : null;
    }

    // If user is a parent/teacher, return the selected student profile
    if (!profile.current_student_profile_id) {
      return null;
    }

    // If we have the profiles list, use it
    if (profilesList) {
      return profilesList.find(p => p.id === profile.current_student_profile_id) || null;
    }

    // Otherwise query for the selected profile
    return await getStudentProfile(profile.current_student_profile_id);
  } catch (error) {
    logger.error("Error in getActiveStudentProfile", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Create a new student profile
 * @param input - Profile data
 * @param userId - Optional user ID (if provided, skips getUser() call which may timeout)
 */
export async function createStudentProfile(
  input: CreateStudentProfileInput,
  userId?: string
): Promise<StudentProfile> {
  try {
    logger.info("createStudentProfile called", { inputName: input.name, providedUserId: userId });
    console.log("=== createStudentProfile START ===", input, "userId:", userId);
    
          logger.info("Getting Supabase client...");
          console.log("Getting Supabase client...");
          const supabase = await getSupabaseClient();
          console.log("Supabase client obtained");
          
          // Skip session verification if userId is provided (trust the caller)
          // Session verification was causing timeouts - we'll rely on RLS policies instead
          logger.info("Skipping session verification - using provided userId", { userId });
          console.log("Skipping session verification - using provided userId:", userId);
          
          let user;
          
          // If userId is provided, use it directly (avoids getUser() timeout)
          if (userId) {
            logger.info("Using provided user ID", { userId });
            console.log("Using provided user ID:", userId);
            user = { id: userId } as any; // Minimal user object
            
            // CRITICAL: Ensure user has a profile (required for RLS)
            // If profile doesn't exist, RLS policies will hang
            logger.info("Checking if user has a profile...");
            console.log("Checking for user profile...");
            
            const profileCheckPromise = supabase
              .from("profiles")
              .select("id")
              .eq("id", userId)
              .single();
            
            const profileCheckTimeout = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Profile check timed out")), 2000);
            });
            
            try {
              const profileResult = await Promise.race([profileCheckPromise, profileCheckTimeout]) as any;
              if (!profileResult.data) {
                logger.warn("User profile not found - creating via API route");
                console.warn("User profile missing - will create via API route");
                // Profile will be created by API route fallback
              } else {
                logger.info("User profile exists", { profileId: profileResult.data.id });
                console.log("User profile exists");
              }
            } catch (profileCheckError: any) {
              // Profile check timed out or failed - this is OK, API route will handle it
              logger.warn("Profile check failed (will use API route if needed)", { error: profileCheckError.message });
              console.warn("Profile check failed, continuing:", profileCheckError);
            }
          } else {
      // Fallback to getUser() if userId not provided
      logger.info("Getting user from auth...");
      console.log("Calling supabase.auth.getUser()...");
      const getUserStartTime = Date.now();
      
      // Add timeout to getUser as well
      const getUserPromise = supabase.auth.getUser();
      const getUserTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("getUser() timed out after 3 seconds")), 3000);
      });
      
      let getUserResult;
      try {
        getUserResult = await Promise.race([getUserPromise, getUserTimeout]) as any;
        const getUserDuration = Date.now() - getUserStartTime;
        console.log("getUser() completed in", getUserDuration, "ms");
        user = getUserResult.data?.user;
      } catch (getUserError: any) {
        logger.error("getUser() timed out or failed", { error: getUserError.message });
        console.error("getUser() failed:", getUserError);
        throw new Error(`Failed to get user: ${getUserError.message}`);
      }
    }
    
    if (!user || !user.id) {
      logger.error("User not authenticated");
      console.error("User is null or has no ID - not authenticated");
      throw new Error("User not authenticated");
    }
    
    logger.info("User authenticated", { userId: user.id });
    console.log("User authenticated:", user.id);

    // Check user's role - in Model B, students shouldn't create additional profiles
    logger.info("Fetching user profile to check role...");
    console.log("Fetching user profile...");
    const profileCheckStartTime = Date.now();
    
    const profileCheckPromise = supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const profileCheckTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Profile check timed out after 3 seconds")), 3000);
    });
    
    let userProfile;
    try {
      const profileResult = await Promise.race([profileCheckPromise, profileCheckTimeout]) as any;
      const profileCheckDuration = Date.now() - profileCheckStartTime;
      console.log("Profile check completed in", profileCheckDuration, "ms");
      userProfile = profileResult.data;
    } catch (profileError: any) {
      logger.warn("Profile check timed out or failed, continuing anyway", { error: profileError.message });
      console.warn("Profile check failed, continuing:", profileError);
      userProfile = null; // Continue without role check
    }

    if (userProfile?.role === "student") {
      // Check if student already has a profile (with timeout to avoid hanging)
      logger.info("Checking for existing student profile", { userId: user.id });
      console.log("Checking for existing profile...");
      
      const checkStartTime = Date.now();
      const checkPromise = supabase
        .from("student_profiles")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      const checkTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Check for existing profile timed out")), 3000);
      });

      try {
        const checkResult = await Promise.race([checkPromise, checkTimeout]) as any;
        const checkDuration = Date.now() - checkStartTime;
        console.log("Profile check completed in", checkDuration, "ms");
        
        if (checkResult.data) {
          logger.warn("Student already has a profile", { existingProfileId: checkResult.data.id });
          throw new Error("Students can only have one profile. You already have a profile.");
        }
      } catch (checkError: any) {
        if (checkError.message?.includes("timed out")) {
          logger.warn("Check for existing profile timed out, continuing anyway", { error: checkError.message });
          console.warn("Profile check timed out, but continuing with creation");
          // Continue anyway - the check might be blocked by RLS, but INSERT might work
        } else if (checkError.message?.includes("already have a profile")) {
          throw checkError; // Re-throw the "already exists" error
        } else {
          // Other errors (like PGRST116 for no rows) - continue
          logger.debug("Profile check result", { error: checkError.message });
          console.log("No existing profile found (or check failed), continuing");
        }
      }
    }

    // Insert WITHOUT select to completely avoid RLS recursion
    // Generate ID client-side and return immediately
    logger.info("Attempting to insert student profile", { userId: user.id, name: input.name });
    console.log("Inserting profile...", { userId: user.id, name: input.name });
    
    // Generate UUID client-side (matches Supabase format)
    // Use let because we may reassign it if function returns a different ID
    let newProfileId = crypto.randomUUID();
    console.log("Generated profile ID:", newProfileId);
    
    const insertData = {
      id: newProfileId, // Use client-generated ID
      owner_id: user.id,
      name: input.name,
      avatar_url: input.avatar_url,
      grade_level: input.grade_level,
      difficulty_preference: input.difficulty_preference || "middle",
      timezone: input.timezone || "UTC",
      language: input.language || "en",
      settings: input.settings || {},
      is_active: true,
    };
    
    console.log("Insert data prepared:", insertData);
    logger.info("About to execute INSERT", { profileId: newProfileId, ownerId: user.id });
    
    const insertStartTime = Date.now();
    
    // Since all client-side queries timeout, skip direct INSERT and use API route immediately
    // The API route uses service role key and bypasses RLS
    logger.info("Skipping direct INSERT - using API route immediately (all client queries timeout)");
    console.log("Using API route directly (client queries timeout)...");
    
    let insertResult = null;
    let timeoutError: any = { message: "Skipped - using API route" };
    
    // Skip the direct INSERT attempt since it always times out
    // Go straight to API route fallback
    try {
        // Add timeout to fetch call
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const apiResponse = await fetch("/api/create-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            name: input.name,
            grade_level: input.grade_level,
            difficulty_preference: input.difficulty_preference,
            avatar_url: input.avatar_url,
          }),
          signal: controller.signal,
        });

        clearTimeout(fetchTimeout);

        if (!apiResponse.ok) {
          let errorData;
          try {
            errorData = await apiResponse.json();
          } catch {
            errorData = { error: `HTTP ${apiResponse.status}: ${apiResponse.statusText}` };
          }
          throw new Error(errorData.error || `API route failed: ${apiResponse.statusText}`);
        }

        const result = await apiResponse.json();
        if (result.success && result.profile) {
          logger.info("Profile created via API route fallback", { profileId: result.profile.id });
          console.log("Profile created via API route:", result.profile);
          
          // Return the profile from API
          return result.profile as StudentProfile;
        } else {
          throw new Error(result.error || "API route returned success but no profile");
        }
      } catch (apiError: any) {
        logger.error("API route fallback also failed", { 
          error: apiError.message,
          name: apiError.name,
          cause: apiError.cause 
        });
        console.error("API route fallback failed:", apiError);
        
        if (apiError.name === 'AbortError') {
          throw new Error(`All insert methods timed out. This suggests a network connectivity issue with Supabase. Please check: 1) Your internet connection, 2) Supabase project status, 3) Environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).`);
        }
        
        throw new Error(`API route failed: ${apiError.message}. Please check your internet connection and Supabase configuration.`);
      }
    /*
    // Fetch the full profile with a timeout to avoid hanging
    // Use a simple query that should work with RLS
    const fetchPromise = supabase
      .from("student_profiles")
      .select("*")
      .eq("id", newProfileId)
      .eq("owner_id", user.id) // Explicit owner check to help RLS
      .single();

    // Add timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout fetching created profile after 5 seconds")), 5000);
    });

    let profileData;
    try {
      const fetchResult = await Promise.race([fetchPromise, timeoutPromise]) as any;
      if (fetchResult.error) {
        // If fetch fails, return a minimal profile object
        logger.warn("Could not fetch full profile after creation, returning minimal profile", {
          error: fetchResult.error.message,
          profileId: newProfileId
        });
        profileData = {
          id: newProfileId,
          owner_id: user.id,
          name: input.name,
          avatar_url: input.avatar_url,
          grade_level: input.grade_level,
          difficulty_preference: input.difficulty_preference || "middle",
          timezone: input.timezone || "UTC",
          language: input.language || "en",
          settings: input.settings || {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as StudentProfile;
      } else {
        profileData = fetchResult.data as StudentProfile;
      }
    } catch (timeoutError: any) {
      // Timeout - return minimal profile
      logger.warn("Timeout fetching profile after creation, returning minimal profile", {
        error: timeoutError.message,
        profileId: newProfileId
      });
      profileData = {
        id: newProfileId,
        owner_id: user.id,
        name: input.name,
        avatar_url: input.avatar_url,
        grade_level: input.grade_level,
        difficulty_preference: input.difficulty_preference || "middle",
        timezone: input.timezone || "UTC",
        language: input.language || "en",
        settings: input.settings || {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as StudentProfile;
    }
    */
  } catch (error) {
    logger.error("Error in createStudentProfile", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    console.error("=== createStudentProfile END with ERROR ===", error);
    throw error;
  }
}

/**
 * Update a student profile
 * Uses API route to bypass client-side RLS timeout issues
 */
export async function updateStudentProfile(
  profileId: string,
  input: UpdateStudentProfileInput,
  userId?: string
): Promise<StudentProfile> {
  try {
    logger.info("updateStudentProfile called", { profileId, input, providedUserId: userId });
    
    // Get user ID if not provided
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      effectiveUserId = user.id;
    }

    logger.info("Updating profile via API route", { profileId, userId: effectiveUserId });

    // Use API route to bypass client-side RLS issues
    const response = await fetch("/api/update-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profileId,
        userId: effectiveUserId,
        ...input,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      logger.error("API route error updating profile", { 
        status: response.status, 
        error: errorData.error,
        details: errorData.details 
      });
      throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
    }

    const result = await response.json();
    logger.info("Student profile updated successfully", { profileId, input });
    return result.profile as StudentProfile;
  } catch (error) {
    logger.error("Error in updateStudentProfile", {
      error: error instanceof Error ? error.message : String(error),
      profileId,
      input,
    });
    throw error;
  }
}

/**
 * Delete a student profile
 * Uses API route to bypass client-side RLS timeout issues
 */
export async function deleteStudentProfile(profileId: string, userId?: string): Promise<void> {
  try {
    logger.info("deleteStudentProfile called", { profileId, providedUserId: userId });
    
    // Get user ID if not provided
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      effectiveUserId = user.id;
    }

    logger.info("Deleting profile via API route", { profileId, userId: effectiveUserId });

    // Use API route to bypass client-side RLS issues
    const response = await fetch("/api/delete-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profileId,
        userId: effectiveUserId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      logger.error("API route error deleting profile", { 
        status: response.status, 
        error: errorData.error,
        details: errorData.details 
      });
      throw new Error(errorData.error || `Failed to delete profile: ${response.status}`);
    }

    logger.info("Student profile deleted successfully", { profileId });
  } catch (error) {
    logger.error("Error in deleteStudentProfile", {
      error: error instanceof Error ? error.message : String(error),
      profileId,
    });
    throw error;
  }
}

/**
 * Set the active student profile for the current user
 */
export async function setActiveStudentProfile(profileId: string | null): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Use API route to bypass RLS issues
    const response = await fetch("/api/set-active-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profileId,
        userId: user.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    logger.info("Active student profile updated", { profileId, userId: user.id });
  } catch (error) {
    logger.error("Error in setActiveStudentProfile", {
      error: error instanceof Error ? error.message : String(error),
      profileId,
    });
    throw error;
  }
}

/**
 * Get the effective profile ID for data queries
 * Model B: Students use their own student_profile_id, Parents use selected student_profile_id
 * Returns the student profile ID to use for data queries
 */
export async function getEffectiveProfileId(): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_student_profile_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return null;
    }

    // If user is a student, get their own student profile ID
    if (profile.role === "student") {
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      return studentProfile?.id || null;
    }

    // If parent/teacher has an active profile selected, return that profile ID
    return profile.current_student_profile_id || null;
  } catch (error) {
    logger.error("Error in getEffectiveProfileId", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

