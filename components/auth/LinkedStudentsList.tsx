"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getParentRelationships, deleteRelationship, type ProfileRelationship } from "@/services/profileRelationshipService";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

interface LinkedStudent {
  relationship: ProfileRelationship;
  student_profile: {
    id: string;
    name: string;
    grade_level: string | null;
    avatar_url: string | null;
  };
}

export default function LinkedStudentsList({ onStudentSelect }: { onStudentSelect?: (studentProfileId: string) => void }) {
  const { activeProfile, setActiveProfile, refreshProfiles } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadLinkedStudents();
  }, []);

  const loadLinkedStudents = async () => {
    try {
      setIsLoading(true);
      const relationships = await getParentRelationships();
      
      // Get student profile data for each relationship
      const supabase = await import("@/lib/supabase").then(m => m.getSupabaseClient());
      
      const students = await Promise.all(
        relationships.map(async (rel) => {
          const { data: studentProfile } = await supabase
            .from("student_profiles")
            .select("id, name, grade_level, avatar_url")
            .eq("id", rel.student_profile_id)
            .single();

          return {
            relationship: rel,
            student_profile: studentProfile || {
              id: rel.student_profile_id,
              name: "Unknown",
              grade_level: null,
              avatar_url: null,
            },
          };
        })
      );

      setLinkedStudents(students);
    } catch (error) {
      logger.error("Error loading linked students", { error });
      showToast("Failed to load linked students", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async (relationshipId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to unlink from ${studentName}? You will no longer be able to view their progress.`)) {
      return;
    }

    try {
      setIsUnlinking(relationshipId);
      await deleteRelationship(relationshipId);
      showToast(`Unlinked from ${studentName}`, "success");
      
      // If the unlinked student was active, clear active profile
      const unlinkedStudent = linkedStudents.find(s => s.relationship.id === relationshipId);
      if (unlinkedStudent && activeProfile?.id === unlinkedStudent.student_profile.id) {
        await setActiveProfile(null);
      }

      // Reload linked students
      await loadLinkedStudents();
      
      // Refresh profiles
      if (refreshProfiles) {
        await refreshProfiles();
      }
    } catch (error) {
      logger.error("Error unlinking student", { error });
      showToast("Failed to unlink student. Please try again.", "error");
    } finally {
      setIsUnlinking(null);
    }
  };

  const handleSelect = async (studentProfileId: string) => {
    try {
      await setActiveProfile(studentProfileId);
      if (onStudentSelect) {
        onStudentSelect(studentProfileId);
      }
    } catch (error) {
      logger.error("Error selecting student", { error });
      showToast("Failed to switch student view", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading linked students...
      </div>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          No students linked yet.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Use the search above to link to a student account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
        Linked Students:
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {linkedStudents.map((linked) => {
          const isActive = activeProfile?.id === linked.student_profile.id;
          
          return (
            <div
              key={linked.relationship.id}
              className={`p-3 border rounded-lg transition-colors ${
                isActive
                  ? "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => handleSelect(linked.student_profile.id)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  {linked.student_profile.avatar_url ? (
                    <img
                      src={linked.student_profile.avatar_url}
                      alt={linked.student_profile.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-white text-xs font-medium">
                      {linked.student_profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {linked.student_profile.name}
                      {isActive && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Active)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {linked.student_profile.grade_level && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {linked.student_profile.grade_level}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {linked.relationship.can_view_progress ? "View" : "No access"} •{" "}
                        {linked.relationship.can_manage_profile ? "Manage" : "View only"}
                      </span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleUnlink(linked.relationship.id, linked.student_profile.name)}
                  disabled={isUnlinking === linked.relationship.id}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors disabled:opacity-50"
                >
                  {isUnlinking === linked.relationship.id ? "Unlinking..." : "Unlink"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

