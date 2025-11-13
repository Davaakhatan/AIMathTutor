import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LearningPath } from "@/services/learningPathGenerator";
import { logger } from "@/lib/logger";

/**
 * Hook for managing learning path with database sync
 */
export function useLearningPath() {
  const { user, activeProfile, userRole } = useAuth();
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load learning path from database
  const loadFromDatabase = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const profileIdForQuery = userRole === "student" ? null : (activeProfile?.id || null);
      const profileIdParam = profileIdForQuery ? `&profileId=${profileIdForQuery}` : "";
      const apiUrl = `/api/learning-paths?userId=${user.id}${profileIdParam}`;

      logger.debug("Loading learning path from database", {
        userId: user.id,
        profileIdForQuery,
        userRole,
      });

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch learning path: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setLearningPath(result.path);
        logger.debug("Learning path loaded from database", {
          hasPath: !!result.path,
          pathId: result.path?.id,
        });
      } else {
        logger.error("Error loading learning path", { error: result.error });
        setLearningPath(null);
      }
    } catch (error) {
      logger.error("Exception loading learning path", { error });
      setLearningPath(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, userRole, activeProfile?.id]);

  // Save learning path to database
  const saveToDatabase = useCallback(
    async (path: LearningPath | null) => {
      if (!user) {
        logger.warn("Cannot save learning path: user not logged in");
        return;
      }

      try {
        setIsSaving(true);
        const profileIdForQuery = userRole === "student" ? null : (activeProfile?.id || null);

        logger.debug("Saving learning path to database", {
          userId: user.id,
          profileIdForQuery,
          pathId: path?.id,
          goal: path?.goal,
        });

        if (path === null) {
          // Delete learning path
          const profileIdParam = profileIdForQuery ? `&profileId=${profileIdForQuery}` : "";
          const deleteUrl = `/api/learning-paths?userId=${user.id}${profileIdParam}`;
          const deleteResponse = await fetch(deleteUrl, { method: "DELETE" });

          if (!deleteResponse.ok) {
            throw new Error(`Failed to delete learning path: ${deleteResponse.statusText}`);
          }

          const deleteResult = await deleteResponse.json();
          if (deleteResult.success) {
            setLearningPath(null);
            logger.debug("Learning path deleted from database");
          } else {
            throw new Error(deleteResult.error || "Failed to delete learning path");
          }
        } else {
          // Save/update learning path
          const saveResponse = await fetch("/api/learning-paths", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              profileId: profileIdForQuery,
              path: {
                ...path,
                lastUpdated: Date.now(),
              },
            }),
          });

          if (!saveResponse.ok) {
            throw new Error(`Failed to save learning path: ${saveResponse.statusText}`);
          }

          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            // Update state immediately with the saved path (which includes updated currentStep)
            setLearningPath(saveResult.path);
            logger.debug("Learning path saved to database and state updated", {
              pathId: saveResult.path.id,
              currentStep: saveResult.path.currentStep,
              completedSteps: saveResult.path.steps.filter((s: any) => s.completed).length,
            });
          } else {
            throw new Error(saveResult.error || "Failed to save learning path");
          }
        }
      } catch (error) {
        logger.error("Exception saving learning path", { error });
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id, userRole, activeProfile?.id]
  );

  // Load on mount and when user/profile changes
  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  // Listen for learning path updates
  useEffect(() => {
    const handlePathUpdate = () => {
      loadFromDatabase();
    };

    window.addEventListener("learning_path_updated", handlePathUpdate);
    return () => {
      window.removeEventListener("learning_path_updated", handlePathUpdate);
    };
  }, [loadFromDatabase]);

  return {
    learningPath,
    isLoading,
    isSaving,
    setLearningPath: saveToDatabase,
    reload: loadFromDatabase,
  };
}

