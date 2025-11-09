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
  const { user, activeProfile, userRole } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localStreakData, setLocalStreakData] = useLocalStorage<StreakDataLocal>("aitutor-streak", {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
  });

  // Load streak data - Optimistic loading with background sync
  useEffect(() => {
    let isMounted = true;
    
    // OPTIMISTIC LOADING: Show localStorage data immediately
    const localData = {
      current_streak: localStreakData.currentStreak || 0,
      longest_streak: localStreakData.longestStreak || 0,
      last_study_date: localStreakData.lastStudyDate
        ? new Date(localStreakData.lastStudyDate).toISOString().split("T")[0]
        : null,
    };
    setStreakData(localData);
    setIsLoading(false); // Show immediately
    
    if (!user) {
      // Guest mode - localStorage only, already set above
      return;
    }

    // For logged-in users: Load from database in BACKGROUND
    const loadFromDatabase = async () => {
      // Don't set loading true - we already showed localStorage data
      
      try {
        // CRITICAL: For student users, ALWAYS use user-level streaks (profileId = null)
        // For parents/teachers, use activeProfile if set
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
        
        logger.info("Loading streaks from database", { userId: user.id, profileId: profileIdToUse, userRole });
        
        const data = await getStreakData(user.id, profileIdToUse);
        
        if (!isMounted) return;
        
        if (data) {
          setStreakData(data);
          
          // Also update localStorage cache
          setLocalStreakData({
            currentStreak: data.current_streak || 0,
            longestStreak: data.longest_streak || 0,
            lastStudyDate: data.last_study_date
              ? new Date(data.last_study_date).getTime()
              : null,
          });
        } else {
          // No database data - keep showing localStorage
          logger.warn("No streak data in database, keeping localStorage", { userId: user.id });
        }
        
        // isLoading already false from initial set
      } catch (error) {
        logger.error("Error loading streak data", { error, userId: user.id });
        if (!isMounted) return;
        
        // Already showing localStorage, no need to set again
      }
    };
    
    loadFromDatabase();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userRole]); // Depend on user ID and role (not profile for students)

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
          // CRITICAL: For student users, ALWAYS use user-level streaks (profileId = null)
          const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
          await updateStreakData(user.id, updatedData, profileIdToUse);
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

