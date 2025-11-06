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
 */
export async function getStudentProfiles(): Promise<StudentProfile[]> {
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
        // If profile doesn't exist yet (new student), return empty array instead of throwing
        // The trigger should create it, but if it hasn't run yet, we'll just return empty
        if (error.code === "PGRST116" || error.message?.includes("No rows")) {
          logger.warn("Student profile not found yet, returning empty array", { userId: user.id });
          return [];
        }
        logger.error("Error fetching student's own profile", { error: error.message });
        throw error;
      }

      return (data || []) as StudentProfile[];
    }

    // If user is a parent/teacher, get linked student profiles via relationships
    const { data: relationships, error: relError } = await supabase
      .from("profile_relationships")
      .select(`
        student_profile_id,
        student_profiles:student_profile_id (*)
      `)
      .eq("parent_id", user.id);

    if (relError) {
      logger.error("Error fetching linked student profiles", { error: relError.message });
      throw relError;
    }

    // Extract student profiles from relationships
    const studentProfiles = (relationships || [])
      .map((rel: any) => rel.student_profiles)
      .filter((p: any) => p !== null) as StudentProfile[];

    return studentProfiles;
  } catch (error) {
    logger.error("Error in getStudentProfiles", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
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
 */
export async function createStudentProfile(
  input: CreateStudentProfileInput
): Promise<StudentProfile> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("student_profiles")
      .insert({
        owner_id: user.id,
        name: input.name,
        avatar_url: input.avatar_url,
        grade_level: input.grade_level,
        difficulty_preference: input.difficulty_preference || "middle",
        timezone: input.timezone || "UTC",
        language: input.language || "en",
        settings: input.settings || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating student profile", { error: error.message, input });
      throw error;
    }

    logger.info("Student profile created", { profileId: data.id, name: input.name });
    return data as StudentProfile;
  } catch (error) {
    logger.error("Error in createStudentProfile", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    throw error;
  }
}

/**
 * Update a student profile
 */
export async function updateStudentProfile(
  profileId: string,
  input: UpdateStudentProfileInput
): Promise<StudentProfile> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // First verify the profile exists and belongs to the user
    const { data: existing, error: checkError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("id", profileId)
      .eq("owner_id", user.id)
      .single();
    
    if (checkError || !existing) {
      logger.error("Profile not found or access denied", { profileId, userId: user.id });
      throw new Error("Profile not found or you don't have permission to update it");
    }

    // Update the profile
    const { data, error } = await supabase
      .from("student_profiles")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating student profile", { error: error.message, profileId, input });
      throw error;
    }

    logger.info("Student profile updated", { profileId, input });
    return data as StudentProfile;
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
 */
export async function deleteStudentProfile(profileId: string): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // First, check if this is the active profile and clear it
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_student_profile_id")
      .eq("id", user.id)
      .single();

    if (profile?.current_student_profile_id === profileId) {
      // Clear the active profile
      await supabase
        .from("profiles")
        .update({ current_student_profile_id: null })
        .eq("id", user.id);
    }

    const { error } = await supabase
      .from("student_profiles")
      .delete()
      .eq("id", profileId)
      .eq("owner_id", user.id);

    if (error) {
      logger.error("Error deleting student profile", { error: error.message, profileId });
      throw error;
    }

    logger.info("Student profile deleted", { profileId });
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

    // If profileId is provided, verify it belongs to the user
    if (profileId) {
      const profile = await getStudentProfile(profileId);
      if (!profile) {
        throw new Error("Student profile not found or access denied");
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ current_student_profile_id: profileId })
      .eq("id", user.id);

    if (error) {
      logger.error("Error setting active student profile", { error: error.message, profileId });
      throw error;
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

