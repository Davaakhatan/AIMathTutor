/**
 * Profile Relationship Service
 * Manages relationships between parents/teachers and student accounts
 * Model B: Students own their profiles, parents link to them
 */

import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface ProfileRelationship {
  id: string;
  parent_id: string;
  student_profile_id: string;
  relationship_type: "parent" | "teacher" | "guardian" | "tutor";
  can_view_progress: boolean;
  can_manage_profile: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRelationshipInput {
  student_profile_id: string;
  relationship_type?: "parent" | "teacher" | "guardian" | "tutor";
  can_view_progress?: boolean;
  can_manage_profile?: boolean;
}

export interface UpdateRelationshipInput {
  relationship_type?: "parent" | "teacher" | "guardian" | "tutor";
  can_view_progress?: boolean;
  can_manage_profile?: boolean;
}

/**
 * Get all relationships for the current user (as parent)
 */
export async function getParentRelationships(): Promise<ProfileRelationship[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("profile_relationships")
      .select("*")
      .eq("parent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching parent relationships", { error: error.message });
      throw error;
    }

    return (data || []) as ProfileRelationship[];
  } catch (error) {
    logger.error("Error in getParentRelationships", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get all relationships for a student profile (who can view/manage it)
 */
export async function getStudentRelationships(studentProfileId: string): Promise<ProfileRelationship[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Verify the student profile belongs to the current user
    const { data: profile } = await supabase
      .from("student_profiles")
      .select("owner_id")
      .eq("id", studentProfileId)
      .single();

    if (!profile || profile.owner_id !== user.id) {
      throw new Error("Student profile not found or access denied");
    }

    const { data, error } = await supabase
      .from("profile_relationships")
      .select("*")
      .eq("student_profile_id", studentProfileId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching student relationships", { error: error.message, studentProfileId });
      throw error;
    }

    return (data || []) as ProfileRelationship[];
  } catch (error) {
    logger.error("Error in getStudentRelationships", {
      error: error instanceof Error ? error.message : String(error),
      studentProfileId,
    });
    throw error;
  }
}

/**
 * Create a relationship (parent links to student)
 * Note: In a real app, this might require student approval or an invite system
 */
export async function createRelationship(input: CreateRelationshipInput): Promise<ProfileRelationship> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Verify user is a parent/teacher
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "parent" && profile.role !== "teacher")) {
      throw new Error("Only parents and teachers can create relationships");
    }

    // Verify student profile exists
    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("id, owner_id")
      .eq("id", input.student_profile_id)
      .single();

    if (!studentProfile) {
      throw new Error("Student profile not found");
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from("profile_relationships")
      .select("id")
      .eq("parent_id", user.id)
      .eq("student_profile_id", input.student_profile_id)
      .single();

    if (existing) {
      throw new Error("Relationship already exists");
    }

    const { data, error } = await supabase
      .from("profile_relationships")
      .insert({
        parent_id: user.id,
        student_profile_id: input.student_profile_id,
        relationship_type: input.relationship_type || "parent",
        can_view_progress: input.can_view_progress ?? true,
        can_manage_profile: input.can_manage_profile ?? true,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating relationship", { error: error.message, input });
      throw error;
    }

    return data as ProfileRelationship;
  } catch (error) {
    logger.error("Error in createRelationship", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    throw error;
  }
}

/**
 * Update a relationship (update permissions)
 */
export async function updateRelationship(
  relationshipId: string,
  input: UpdateRelationshipInput
): Promise<ProfileRelationship> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("profile_relationships")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", relationshipId)
      .eq("parent_id", user.id) // Ensure user owns the relationship
      .select()
      .single();

    if (error) {
      logger.error("Error updating relationship", { error: error.message, relationshipId, input });
      throw error;
    }

    return data as ProfileRelationship;
  } catch (error) {
    logger.error("Error in updateRelationship", {
      error: error instanceof Error ? error.message : String(error),
      relationshipId,
      input,
    });
    throw error;
  }
}

/**
 * Delete a relationship (unlink parent from student)
 */
export async function deleteRelationship(relationshipId: string): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("profile_relationships")
      .delete()
      .eq("id", relationshipId)
      .eq("parent_id", user.id); // Ensure user owns the relationship

    if (error) {
      logger.error("Error deleting relationship", { error: error.message, relationshipId });
      throw error;
    }
  } catch (error) {
    logger.error("Error in deleteRelationship", {
      error: error instanceof Error ? error.message : String(error),
      relationshipId,
    });
    throw error;
  }
}

/**
 * Get linked student profiles for a parent
 * Returns student profiles that the parent has relationships with
 */
export async function getLinkedStudentProfiles(): Promise<Array<{
  relationship: ProfileRelationship;
  student_profile: {
    id: string;
    owner_id: string;
    name: string;
    avatar_url?: string;
    grade_level?: string;
    difficulty_preference: string;
  };
}>> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("profile_relationships")
      .select(`
        *,
        student_profiles:student_profile_id (
          id,
          owner_id,
          name,
          avatar_url,
          grade_level,
          difficulty_preference
        )
      `)
      .eq("parent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching linked student profiles", { error: error.message });
      throw error;
    }

    return (data || []).map((item: any) => ({
      relationship: {
        id: item.id,
        parent_id: item.parent_id,
        student_profile_id: item.student_profile_id,
        relationship_type: item.relationship_type,
        can_view_progress: item.can_view_progress,
        can_manage_profile: item.can_manage_profile,
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
      student_profile: item.student_profiles,
    }));
  } catch (error) {
    logger.error("Error in getLinkedStudentProfiles", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

