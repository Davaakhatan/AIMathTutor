"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentRelationships, type ProfileRelationship } from "@/services/profileRelationshipService";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

interface LinkedParent {
  relationship: ProfileRelationship;
  parent_profile: {
    id: string;
    email: string;
    username: string | null;
  };
}

/**
 * Component for students to see who has access to their profile
 */
export default function StudentAccessView() {
  const { activeProfile, user, userRole, profiles } = useAuth();
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // For students: use first profile from profiles array (activeProfile is always null for students)
  const studentProfile = userRole === "student" && profiles.length > 0 ? profiles[0] : activeProfile;

  useEffect(() => {
    if (studentProfile && user) {
      loadLinkedParents();
    } else {
      setLinkedParents([]);
      setIsLoading(false);
    }
  }, [studentProfile, user]);

  const loadLinkedParents = async () => {
    if (!studentProfile || !user) {
      setLinkedParents([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Use API route to bypass client-side RLS issues
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      let relationships: any[] = [];
      
      try {
        const response = await fetch("/api/get-student-relationships", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentProfileId: studentProfile.id,
            userId: user.id,
          }),
          signal: controller.signal,
        });

        clearTimeout(fetchTimeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.relationships)) {
          relationships = data.relationships;
        } else {
          relationships = [];
        }
      } catch (fetchError: any) {
        clearTimeout(fetchTimeout);
        if (fetchError.name === "AbortError") {
          throw new Error("Loading timed out");
        }
        throw fetchError;
      }

      if (relationships.length === 0) {
        setLinkedParents([]);
        setIsLoading(false);
        return;
      }

      // Get parent user info from auth.users via API route (admin client only works server-side)
      const parents = await Promise.all(
        relationships.map(async (rel) => {
          try {
            // Get parent email from API route (which uses admin client)
            let email = "";
            let username = null;

            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              
              const response = await fetch("/api/get-user-info", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId: rel.parent_id }),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                  email = data.user.email || "";
                  username = data.user.username || null;
                }
              } else {
                logger.warn("Failed to get parent user info", { 
                  userId: rel.parent_id, 
                  status: response.status 
                });
              }
            } catch (error: any) {
              if (error.name !== "AbortError") {
                logger.warn("Could not get parent user email", { userId: rel.parent_id, error });
              }
            }

            return {
              relationship: rel,
              parent_profile: {
                id: rel.parent_id,
                email: email,
                username: username,
              },
            };
          } catch (error) {
            logger.error("Error processing relationship", { error, relationshipId: rel.id });
            return null;
          }
        })
      );

      // Filter out null results
      const validParents = parents.filter(p => p !== null) as LinkedParent[];
      setLinkedParents(validParents);
    } catch (error) {
      logger.error("Error loading linked parents", { 
        error,
        profileId: activeProfile?.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      
      // Don't show toast for timeout - just show empty state
      if (error instanceof Error && error.message === "Loading timed out") {
        logger.warn("Profile access loading timed out", { profileId: activeProfile?.id });
      } else {
        showToast("Failed to load linked parents", "error");
      }
      
      setLinkedParents([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading access list...
      </div>
    );
  }

  if (linkedParents.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          No one has access to your profile yet.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Share your connection code with a parent or teacher to grant access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-500 to-cyan-500"></div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Who Can View Your Profile
        </p>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {linkedParents.map((linked) => (
          <div
            key={linked.relationship.id}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {linked.parent_profile.email.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {linked.parent_profile.username || linked.parent_profile.email.split("@")[0]}
                  </p>
                </div>
                <p className="text-xs ml-8 text-gray-500 dark:text-gray-400 truncate">
                  {linked.parent_profile.email}
                </p>
                <div className="flex items-center gap-2 mt-1.5 ml-8">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {linked.relationship.can_view_progress ? "View Progress" : "No access"} •{" "}
                    {linked.relationship.can_manage_profile ? "Can Manage" : "View only"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

