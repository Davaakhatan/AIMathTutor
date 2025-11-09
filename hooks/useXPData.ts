"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getXPData, updateXPData, XPData } from "@/services/supabaseDataService";
import { useLocalStorage } from "./useLocalStorage";
import { logger } from "@/lib/logger";

/**
 * Hook to manage XP data with Supabase persistence
 * Falls back to localStorage for guest users
 */
export function useXPData() {
  const { user, activeProfile, userRole } = useAuth();
  const [xpData, setXPData] = useState<XPData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localXPData, setLocalXPData] = useLocalStorage<any>("aitutor-xp", {
    totalXP: 0,
    level: 1,
    xpToNextLevel: 100,
    xpHistory: [],
    recentGains: [],
  });

  // Load XP data - Fetch from database for authenticated users
  useEffect(() => {
    let isMounted = true;
    
    // OPTIMISTIC LOADING: Show localStorage data immediately
    const localData = {
      total_xp: localXPData.totalXP || 0,
      level: localXPData.level || 1,
      xp_to_next_level: localXPData.xpToNextLevel || 100,
      xp_history: localXPData.xpHistory || [],
      recent_gains: localXPData.recentGains || [],
    };
    setXPData(localData);
    setIsLoading(false); // Show immediately
    
    if (!user) {
      // Guest mode - localStorage only, already set above
      return;
    }

    // For authenticated users: Load from database in BACKGROUND
    const loadFromDatabase = async () => {
      try {
        // Don't set loading true - we already showed localStorage data
        
        // CRITICAL: For student users, ALWAYS use user-level XP (profileId = null)
        // For parents/teachers, use activeProfile if set
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
        
        logger.info("Loading XP from database", { userId: user.id, profileId: profileIdToUse, userRole });
        
        // Add timeout wrapper to prevent hanging forever
        const timeoutMs = 5000; // 5 seconds max
        const dataPromise = getXPData(user.id, profileIdToUse);
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => {
            logger.warn("XP query timeout, falling back to localStorage", { userId: user.id });
            resolve(null);
          }, timeoutMs)
        );
        
        const data = await Promise.race([dataPromise, timeoutPromise]);
        
        if (!isMounted) return;
        
        if (data) {
          setXPData(data);
          
          // Also update localStorage cache
          setLocalXPData({
            totalXP: data.total_xp,
            level: data.level,
            xpToNextLevel: data.xp_to_next_level,
            xpHistory: data.xp_history || [],
            recentGains: data.recent_gains || [],
          });
        } else {
          // No database data - keep showing localStorage
          logger.warn("No XP data in database, keeping localStorage", { userId: user.id });
        }
        
        // isLoading already false from initial set
      } catch (error) {
        logger.error("Error loading XP data", { error, userId: user.id });
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

  // Update XP data
  const updateXP = useCallback(
    async (updates: Partial<XPData>) => {
      if (!xpData) return;

      const updatedData = { ...xpData, ...updates };
      setXPData(updatedData);

      // Convert to component format for localStorage
      const localData = {
        totalXP: updatedData.total_xp,
        level: updatedData.level,
        xpToNextLevel: updatedData.xp_to_next_level,
        xpHistory: updatedData.xp_history || [],
        recentGains: updatedData.recent_gains || [],
      };
      setLocalXPData(localData);

      // Save to database if logged in
      if (user) {
        try {
          // CRITICAL: For student users, ALWAYS use user-level XP (profileId = null)
          const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
          await updateXPData(user.id, updatedData, profileIdToUse);
        } catch (error) {
          logger.error("Error updating XP data in database", { error });
          // Revert on error
          setXPData(xpData);
          setLocalXPData({
            totalXP: xpData.total_xp,
            level: xpData.level,
            xpToNextLevel: xpData.xp_to_next_level,
            xpHistory: xpData.xp_history || [],
            recentGains: xpData.recent_gains || [],
          });
        }
      }
    },
    [xpData, user, activeProfile?.id, setLocalXPData]
  );

  // Return data in component-friendly format
  const componentData = xpData
    ? {
        totalXP: xpData.total_xp,
        level: xpData.level,
        xpToNextLevel: xpData.xp_to_next_level,
        xpHistory: xpData.xp_history || [],
        recentGains: xpData.recent_gains || [],
      }
    : {
        totalXP: 0,
        level: 1,
        xpToNextLevel: 100,
        xpHistory: [],
        recentGains: [],
      };

  return {
    xpData: componentData,
    updateXP,
    isLoading,
  };
}

