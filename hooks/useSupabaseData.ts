/**
 * Custom hook for data that syncs with Supabase for authenticated users
 * For guests: uses localStorage only
 * For authenticated users: writes to Supabase AND localStorage (cache)
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalStorage } from "./useLocalStorage";
import { 
  getXPData, 
  updateXPData, 
  getStreakData, 
  updateStreakData,
  type XPData as SupabaseXPData,
  type StreakData as SupabaseStreakData,
} from "@/services/supabaseDataService";
import { logger } from "@/lib/logger";

// Convert Supabase format to localStorage format
function convertXPData(supabaseData: SupabaseXPData | null): any {
  if (!supabaseData) {
    return { totalXP: 0, level: 1, xpToNextLevel: 100, xpHistory: [], recentGains: [] };
  }
  return {
    totalXP: supabaseData.total_xp,
    level: supabaseData.level,
    xpToNextLevel: supabaseData.xp_to_next_level,
    xpHistory: supabaseData.xp_history,
    recentGains: supabaseData.recent_gains,
  };
}

function convertStreakData(supabaseData: SupabaseStreakData | null): any {
  if (!supabaseData) {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: 0 };
  }
  return {
    currentStreak: supabaseData.current_streak,
    longestStreak: supabaseData.longest_streak,
    lastStudyDate: supabaseData.last_study_date ? new Date(supabaseData.last_study_date).getTime() : 0,
  };
}

/**
 * Hook for XP data that syncs with Supabase
 */
export function useXPData() {
  const { user } = useAuth();
  const [localXPData, setLocalXPData] = useLocalStorage<any>("aitutor-xp", {
    totalXP: 0,
    level: 1,
    xpToNextLevel: 100,
    xpHistory: [],
    recentGains: [],
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Supabase on mount if authenticated
  useEffect(() => {
    if (user && !isSyncing) {
      setIsSyncing(true);
      getXPData(user.id)
        .then((supabaseData) => {
          if (supabaseData) {
            const converted = convertXPData(supabaseData);
            setLocalXPData(converted);
          }
        })
        .catch((error) => {
          logger.error("Error loading XP data from Supabase", { error });
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [user?.id]); // Only run when user changes

  // Update function that writes to both Supabase and localStorage
  const updateXP = useCallback(async (updates: Partial<any>) => {
    const newData = { ...localXPData, ...updates };
    
    // Update localStorage immediately (optimistic update)
    setLocalXPData(newData);
    
    // If authenticated, also update Supabase
    if (user) {
      try {
        const supabaseFormat = {
          total_xp: newData.totalXP,
          level: newData.level,
          xp_to_next_level: newData.xpToNextLevel,
          xp_history: newData.xpHistory || [],
          recent_gains: newData.recentGains || [],
        };
        await updateXPData(user.id, supabaseFormat);
        logger.debug("XP data synced to Supabase", { userId: user.id });
      } catch (error) {
        logger.error("Error syncing XP data to Supabase", { error, userId: user.id });
        // Don't revert - localStorage is the fallback
      }
    }
  }, [user, localXPData, setLocalXPData]);

  return [localXPData, updateXP] as const;
}

/**
 * Hook for streak data that syncs with Supabase
 */
export function useStreakData() {
  const { user } = useAuth();
  const [localStreakData, setLocalStreakData] = useLocalStorage<any>("aitutor-streak", {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Supabase on mount if authenticated
  useEffect(() => {
    if (user && !isSyncing) {
      setIsSyncing(true);
      getStreakData(user.id)
        .then((supabaseData) => {
          if (supabaseData) {
            const converted = convertStreakData(supabaseData);
            setLocalStreakData(converted);
          }
        })
        .catch((error) => {
          logger.error("Error loading streak data from Supabase", { error });
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [user?.id]);

  // Update function that writes to both Supabase and localStorage
  const updateStreak = useCallback(async (updates: Partial<any>) => {
    const newData = { ...localStreakData, ...updates };
    
    // Update localStorage immediately (optimistic update)
    setLocalStreakData(newData);
    
    // If authenticated, also update Supabase
    if (user) {
      try {
        const supabaseFormat = {
          current_streak: newData.currentStreak,
          longest_streak: newData.longestStreak,
          last_study_date: newData.lastStudyDate ? new Date(newData.lastStudyDate).toISOString().split("T")[0] : null,
        };
        await updateStreakData(user.id, supabaseFormat);
        logger.debug("Streak data synced to Supabase", { userId: user.id });
      } catch (error) {
        logger.error("Error syncing streak data to Supabase", { error, userId: user.id });
        // Don't revert - localStorage is the fallback
      }
    }
  }, [user, localStreakData, setLocalStreakData]);

  return [localStreakData, updateStreak] as const;
}

