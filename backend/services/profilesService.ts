/**
 * Profiles Backend Service
 * Handles all profile-related database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export interface Profile {
  id: string;
  role: string;
  username?: string;
  display_name?: string;
  activeProfileId?: string;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  owner_id: string;
  name: string;
  grade_level?: string;
  school?: string;
  interests?: string[];
  created_at: string;
}

/**
 * Ensure profile exists (create if missing)
 */
export async function ensureProfileExists(
  userId: string,
  role: string = "student"
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    // Check if profile exists
    const { data: existing, error: checkError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!checkError && existing) {
      return { success: true, profile: existing as Profile };
    }

    // Create profile
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        role,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error && error.code !== "23505") {
      logger.error("Error creating profile", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    if (error?.code === "23505") {
      // Already exists, fetch it
      const { data: refetch } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      return { success: true, profile: refetch as Profile };
    }

    logger.info("Profile created", { userId });
    return { success: true, profile: data as Profile };
  } catch (error) {
    logger.error("Exception ensuring profile exists", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Get profile
 */
export async function getProfile(
  userId: string
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("Error fetching profile", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    return { success: true, profile: data as Profile | undefined };
  } catch (error) {
    logger.error("Exception fetching profile", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Update profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      logger.error("Error updating profile", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    logger.debug("Profile updated", { userId });
    return { success: true };
  } catch (error) {
    logger.error("Exception updating profile", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Get student profiles for user
 */
export async function getStudentProfiles(
  userId: string
): Promise<{ success: boolean; profiles: StudentProfile[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, profiles: [], error: "Database not configured" };
    }

    const { data, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Error fetching student profiles", { error: error.message, userId });
      return { success: false, profiles: [], error: error.message };
    }

    return { success: true, profiles: (data || []) as StudentProfile[] };
  } catch (error) {
    logger.error("Exception fetching student profiles", { error, userId });
    return { success: false, profiles: [], error: String(error) };
  }
}

/**
 * Create student profile
 */
export async function createStudentProfile(
  userId: string,
  name: string,
  gradeLevel?: string,
  school?: string
): Promise<{ success: boolean; profile?: StudentProfile; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    // Ensure parent profile exists
    await ensureProfileExists(userId);

    const { data, error } = await supabase
      .from("student_profiles")
      .insert({
        owner_id: userId,
        name,
        grade_level: gradeLevel,
        school,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating student profile", { error: error.message, userId });
      return { success: false, error: error.message };
    }

    logger.info("Student profile created", { id: (data as any).id, userId });
    return { success: true, profile: data as StudentProfile };
  } catch (error) {
    logger.error("Exception creating student profile", { error, userId });
    return { success: false, error: String(error) };
  }
}

/**
 * Update student profile
 */
export async function updateStudentProfile(
  userId: string,
  profileId: string,
  updates: Partial<StudentProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    // Verify ownership
    const { data: existing, error: checkError } = await supabase
      .from("student_profiles")
      .select("owner_id")
      .eq("id", profileId)
      .single();

    if (checkError || !existing || (existing as any).owner_id !== userId) {
      return { success: false, error: "Profile not found or not authorized" };
    }

    const { error } = await supabase
      .from("student_profiles")
      .update(updates)
      .eq("id", profileId);

    if (error) {
      logger.error("Error updating student profile", { error: error.message, profileId });
      return { success: false, error: error.message };
    }

    logger.debug("Student profile updated", { profileId });
    return { success: true };
  } catch (error) {
    logger.error("Exception updating student profile", { error, profileId });
    return { success: false, error: String(error) };
  }
}

/**
 * Delete student profile
 */
export async function deleteStudentProfile(
  userId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("student_profiles")
      .select("owner_id")
      .eq("id", profileId)
      .single();

    if (!existing || (existing as any).owner_id !== userId) {
      return { success: false, error: "Profile not found or not authorized" };
    }

    const { error } = await supabase
      .from("student_profiles")
      .delete()
      .eq("id", profileId);

    if (error) {
      logger.error("Error deleting student profile", { error: error.message, profileId });
      return { success: false, error: error.message };
    }

    logger.info("Student profile deleted", { profileId, userId });
    return { success: true };
  } catch (error) {
    logger.error("Exception deleting student profile", { error, profileId });
    return { success: false, error: String(error) };
  }
}

/**
 * Get profile relationships (for parents/teachers)
 */
export async function getProfileRelationships(
  profileId: string
): Promise<{ success: boolean; relationships: any[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, relationships: [], error: "Database not configured" };
    }

    const { data, error } = await supabase
      .from("profile_relationships")
      .select("*")
      .eq("student_profile_id", profileId);

    if (error) {
      logger.error("Error fetching relationships", { error: error.message, profileId });
      return { success: false, relationships: [], error: error.message };
    }

    return { success: true, relationships: data || [] };
  } catch (error) {
    logger.error("Exception fetching relationships", { error, profileId });
    return { success: false, relationships: [], error: String(error) };
  }
}
