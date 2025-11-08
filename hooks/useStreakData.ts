"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getStreakData, updateStreakData, StreakData } from "@/services/supabaseDataService";
import { useLocalStorage } from "./useLocalStorage";
import { logger } from "@/lib/logger";

interface StreakDataLocal {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: number | null; // timestamp
}

/**
 * Hook to manage streak data with Supabase persistence
 * Falls back to localStorage for guest users
 */
export function useStreakData() {
  const { user, activeProfile } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localStreakData, setLocalStreakData] = useLocalStorage<StreakDataLocal>("aitutor-streak", {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
  });

  // Load streak data - show localStorage immediately, then sync from database
  useEffect(() => {
    let isMounted = true;
    
    // STEP 1: Load from localStorage IMMEDIATELY (no loading state)
    const localData = {
      current_streak: localStreakData.currentStreak || 0,
      longest_streak: localStreakData.longestStreak || 0,
      last_study_date: localStreakData.lastStudyDate
        ? new Date(localStreakData.lastStudyDate).toISOString().split("T")[0]
        : null,
    };
    
    setStreakData(localData);
    setIsLoading(false); // Show data immediately
    
    // STEP 2: Sync from database in background (only for logged-in users)
    if (user) {
      const syncFromDatabase = async () => {
        try {
          const data = await getStreakData(user.id, activeProfile?.id || null);
          
          if (isMounted && data) {
            // Update state with database data
            setStreakData(data);
            
            // Also sync to localStorage as cache
            setLocalStreakData({
              currentStreak: data.current_streak || 0,
              longestStreak: data.longest_streak || 0,
              lastStudyDate: data.last_study_date
                ? new Date(data.last_study_date).getTime()
                : null,
            });
          }
        } catch (error) {
          logger.error("Error syncing streak data from database", { error });
          // Don't update state on error - keep localStorage data
        }
      };
      
      // Sync in background (don't block UI)
      syncFromDatabase();
    }
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeProfile?.id]); // Only depend on IDs, not full objects

  // Update streak data
  const updateStreak = useCallback(
    async (updates: Partial<StreakData>) => {
      if (!streakData) return;

      const updatedData = { ...streakData, ...updates };
      setStreakData(updatedData);

      // Convert to localStorage format
      const localData: StreakDataLocal = {
        currentStreak: updatedData.current_streak || 0,
        longestStreak: updatedData.longest_streak || 0,
        lastStudyDate: updatedData.last_study_date
          ? new Date(updatedData.last_study_date).getTime()
          : null,
      };
      setLocalStreakData(localData);

      // Save to database if logged in
      if (user) {
        try {
          await updateStreakData(user.id, updatedData, activeProfile?.id || null);
        } catch (error) {
          logger.error("Error updating streak data in database", { error });
          // Revert on error
          setStreakData(streakData);
          setLocalStreakData({
            currentStreak: streakData.current_streak || 0,
            longestStreak: streakData.longest_streak || 0,
            lastStudyDate: streakData.last_study_date
              ? new Date(streakData.last_study_date).getTime()
              : null,
          });
        }
      }
    },
    [streakData, user, activeProfile?.id, setLocalStreakData]
  );

  // Return data in component-friendly format
  const componentData = streakData
    ? {
        currentStreak: streakData.current_streak || 0,
        longestStreak: streakData.longest_streak || 0,
        lastStudyDate: streakData.last_study_date
          ? new Date(streakData.last_study_date).getTime()
          : null,
      }
    : {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
      };

  return {
    streakData: componentData,
    updateStreak,
    isLoading,
  };
}

