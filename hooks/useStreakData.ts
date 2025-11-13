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

  // Load streak data - Database first for logged-in users
  useEffect(() => {
    let isMounted = true;
    
    if (!user) {
      // Guest mode - localStorage only
      const localData = {
        current_streak: localStreakData.currentStreak || 0,
        longest_streak: localStreakData.longestStreak || 0,
        last_study_date: localStreakData.lastStudyDate
          ? new Date(localStreakData.lastStudyDate).toISOString().split("T")[0]
          : null,
      };
      setStreakData(localData);
      setIsLoading(false);
      return;
    }

    // For logged-in users: Load from database FIRST (don't show localStorage first)
    const loadFromDatabase = async () => {
      setIsLoading(true);
      console.log("[useStreakData] Starting database load", { userId: user.id, userRole });
      
      try {
        // CRITICAL: For student users, ALWAYS use user-level streaks (profileId = null)
        // For parents/teachers, use activeProfile if set
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
        
        logger.info("Loading streaks from database", { userId: user.id, profileId: profileIdToUse, userRole });
        
        const data = await getStreakData(user.id, profileIdToUse);
        
        if (!isMounted) return;
        
        if (data) {
          logger.info("Streak data received from getStreakData", { 
            userId: user.id, 
            currentStreak: data.current_streak,
            longestStreak: data.longest_streak,
            lastStudyDate: data.last_study_date
          });
          
          setStreakData(data);
          
          // Also update localStorage cache
          setLocalStreakData({
            currentStreak: data.current_streak || 0,
            longestStreak: data.longest_streak || 0,
            lastStudyDate: data.last_study_date
              ? new Date(data.last_study_date).getTime()
              : null,
          });
          logger.info("Streak data loaded from database and state updated", { 
            userId: user.id, 
            currentStreak: data.current_streak,
            longestStreak: data.longest_streak 
          });
        } else {
          // No database data - fallback to localStorage
          logger.warn("No streak data in database, using localStorage", { userId: user.id });
          const localData = {
            current_streak: localStreakData.currentStreak || 0,
            longest_streak: localStreakData.longestStreak || 0,
            last_study_date: localStreakData.lastStudyDate
              ? new Date(localStreakData.lastStudyDate).toISOString().split("T")[0]
              : null,
          };
          setStreakData(localData);
        }
      } catch (error) {
        logger.error("Error loading streak data", { error, userId: user.id });
        if (!isMounted) return;
        
        // Fallback to localStorage on error
        const localData = {
          current_streak: localStreakData.currentStreak || 0,
          longest_streak: localStreakData.longestStreak || 0,
          last_study_date: localStreakData.lastStudyDate
            ? new Date(localStreakData.lastStudyDate).toISOString().split("T")[0]
            : null,
        };
        setStreakData(localData);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadFromDatabase();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userRole, activeProfile?.id]); // Include activeProfile for parents/teachers

  // Listen for streak update events (from orchestrator or other sources)
  useEffect(() => {
    if (!user) return;

    const handleStreakUpdate = async () => {
      try {
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
        const data = await getStreakData(user.id, profileIdToUse);
        
        if (data) {
          setStreakData(data);
          setLocalStreakData({
            currentStreak: data.current_streak || 0,
            longestStreak: data.longest_streak || 0,
            lastStudyDate: data.last_study_date
              ? new Date(data.last_study_date).getTime()
              : null,
          });
          logger.debug("Streak data refreshed from event", { 
            userId: user.id, 
            currentStreak: data.current_streak 
          });
        }
      } catch (error) {
        logger.error("Error refreshing streak data from event", { error, userId: user.id });
      }
    };

    window.addEventListener("streak_updated", handleStreakUpdate);
    return () => window.removeEventListener("streak_updated", handleStreakUpdate);
  }, [user?.id, userRole, activeProfile?.id, setLocalStreakData]);

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

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log("[useStreakData] Returning component data", {
      hasStreakData: !!streakData,
      componentData,
      isLoading,
    });
  }

  return {
    streakData: componentData,
    updateStreak,
    isLoading,
  };
}

