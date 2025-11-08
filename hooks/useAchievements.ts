/**
 * Hook for achievements that syncs with Supabase
 * Replaces direct localStorage usage
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";
import { getEffectiveProfileId } from "@/services/studentProfileService";

/**
 * Hook for achievements that syncs with database
 */
export function useAchievements() {
  const { user, activeProfile } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from database on mount or when user/profile changes
  useEffect(() => {
    if (!user) {
      // Guest mode - use localStorage only
      try {
        const localData = JSON.parse(localStorage.getItem("aitutor-achievements") || "[]");
        setUnlockedAchievements(localData);
      } catch (error) {
        logger.error("Error loading achievements from localStorage", { error });
        setUnlockedAchievements([]);
      }
      setIsLoading(false);
      return;
    }

    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        const supabase = await getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase client not available");
        }

        const effectiveProfileId = activeProfile?.id || (await getEffectiveProfileId());

        let query = supabase
          .from("achievements")
          .select("achievement_type")
          .eq("user_id", user.id);

        if (effectiveProfileId) {
          query = query.eq("student_profile_id", effectiveProfileId);
        } else {
          query = query.is("student_profile_id", null);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const achievementIds = (data || []).map((a: any) => a.achievement_type).filter(Boolean);
        setUnlockedAchievements(achievementIds);

        // Also update localStorage for offline support
        localStorage.setItem("aitutor-achievements", JSON.stringify(achievementIds));
      } catch (error) {
        logger.error("Error loading achievements from database", { error });
        // Fallback to localStorage
        try {
          const localData = JSON.parse(localStorage.getItem("aitutor-achievements") || "[]");
          setUnlockedAchievements(localData);
        } catch (e) {
          setUnlockedAchievements([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievements();
  }, [user?.id, activeProfile?.id]);

  // Unlock achievement (saves to both localStorage and database)
  const unlockAchievement = useCallback(async (achievementId: string) => {
    if (unlockedAchievements.includes(achievementId)) {
      return; // Already unlocked
    }

    // Update local state immediately (optimistic update)
    const updated = [...unlockedAchievements, achievementId];
    setUnlockedAchievements(updated);
    localStorage.setItem("aitutor-achievements", JSON.stringify(updated));

    // Save to database if authenticated
    if (user) {
      try {
        setIsSyncing(true);
        const supabase = await getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase client not available");
        }

        const effectiveProfileId = activeProfile?.id || (await getEffectiveProfileId());

        const insertData: any = {
          user_id: user.id,
          achievement_type: achievementId,
          unlocked_at: new Date().toISOString(),
        };

        if (effectiveProfileId) {
          insertData.student_profile_id = effectiveProfileId;
        }

        const { error } = await supabase
          .from("achievements")
          .insert(insertData);

        if (error) {
          throw error;
        }

        logger.debug("Achievement unlocked and saved to database", { achievementId, userId: user.id });
      } catch (error) {
        logger.error("Error saving achievement to database", { error, achievementId });
        // Don't revert - localStorage is the fallback
      } finally {
        setIsSyncing(false);
      }
    }
  }, [user, activeProfile?.id, unlockedAchievements]);

  return {
    unlockedAchievements,
    isLoading,
    isSyncing,
    unlockAchievement,
  };
}

