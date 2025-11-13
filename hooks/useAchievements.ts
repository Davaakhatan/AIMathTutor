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
  const { user, activeProfile, userRole } = useAuth();
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

        // CRITICAL: For students, always use user-level (profileId = null)
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
        
        logger.info("Loading achievements from database", { userId: user.id, profileId: profileIdToUse, userRole });

        let query = supabase
          .from("achievements")
          .select("achievement_id, achievement_name")
          .eq("user_id", user.id);

        if (profileIdToUse) {
          query = query.eq("student_profile_id", profileIdToUse);
        } else {
          query = query.is("student_profile_id", null);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Use achievement_id (NOT NULL) instead of achievement_type (nullable)
        const achievementIds = (data || []).map((a: any) => a.achievement_id).filter(Boolean);
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
  }, [user?.id, userRole]); // Depend on userRole, not activeProfile for students

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

        // CRITICAL: For students, always use user-level (profileId = null)
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);

        // Get achievement name from ALL_ACHIEVEMENTS
        const { ALL_ACHIEVEMENTS } = await import("@/services/achievementService");
        const achievement = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
        const achievementName = achievement?.name || achievementId;

        const insertData: any = {
          user_id: user.id,
          achievement_id: achievementId, // Use achievement_id (NOT NULL) instead of achievement_type
          achievement_name: achievementName, // Required NOT NULL field
          unlocked_at: new Date().toISOString(),
          student_profile_id: profileIdToUse,
        };

        // Check if achievement already exists to avoid duplicates
        let checkQuery = supabase
          .from("achievements")
          .select("id")
          .eq("user_id", user.id)
          .eq("achievement_id", achievementId);
        
        if (profileIdToUse) {
          checkQuery = checkQuery.eq("student_profile_id", profileIdToUse);
        } else {
          checkQuery = checkQuery.is("student_profile_id", null);
        }

        const { data: existing } = await checkQuery.maybeSingle();

        if (existing) {
          logger.debug("Achievement already exists in database", { achievementId, userId: user.id });
          return; // Already exists, no need to insert
        }

        const { error } = await supabase
          .from("achievements")
          .insert(insertData);

        if (error) {
          // If it's a unique constraint violation, that's okay - achievement already exists
          if (error.code === '23505') {
            logger.debug("Achievement already exists (unique constraint)", { achievementId, userId: user.id });
            return;
          }
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

