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
 */
export async function getStudentProfiles(): Promise<StudentProfile[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Error fetching student profiles", { error: error.message });
      throw error;
    }

    return (data || []) as StudentProfile[];
  } catch (error) {
    logger.error("Error in getStudentProfiles", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get a specific student profile by ID
 */
export async function getStudentProfile(profileId: string): Promise<StudentProfile | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("owner_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
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
 */
export async function getActiveStudentProfile(): Promise<StudentProfile | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Get user's profile to find current_student_profile_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("current_student_profile_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      logger.warn("User profile not found", { userId: user.id });
      return null;
    }

    // If user is a student, they use their own profile
    if (profile.role === "student") {
      // For students, we can return a default profile or null
      // In the future, we can create a student_profile for them
      return null;
    }

    // If no active profile selected, return null
    if (!profile.current_student_profile_id) {
      return null;
    }

    // Get the active student profile
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

    const { data, error } = await supabase
      .from("student_profiles")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .eq("owner_id", user.id)
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
 * Get the effective user ID for data queries
 * Returns the active student profile ID if set, otherwise the user ID
 */
export async function getEffectiveUserId(): Promise<string | null> {
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
      return user.id; // Fallback to user ID
    }

    // If user is a student, use their own ID
    if (profile.role === "student") {
      return user.id;
    }

    // If parent/teacher has an active profile, use that profile ID
    // For now, we'll still use user_id but track which profile is active
    // In the future, we can add student_profile_id to data tables
    return user.id;
  } catch (error) {
    logger.error("Error in getEffectiveUserId", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

