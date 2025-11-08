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
  const { user, activeProfile } = useAuth();
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
    
    if (!user) {
      // Guest mode - use localStorage only
      const localData = {
        total_xp: localXPData.totalXP || 0,
        level: localXPData.level || 1,
        xp_to_next_level: localXPData.xpToNextLevel || 100,
        xp_history: localXPData.xpHistory || [],
        recent_gains: localXPData.recentGains || [],
      };
      setXPData(localData);
      setIsLoading(false);
      return;
    }

    // For authenticated users: Load from database (with loading state)
    const loadFromDatabase = async () => {
      try {
        setIsLoading(true);
        logger.info("Loading XP data from database", { userId: user.id, profileId: activeProfile?.id });
        
        const data = await getXPData(user.id, activeProfile?.id || null);
        
        if (!isMounted) return;
        
        if (data) {
          const dbData = {
            total_xp: data.total_xp,
            level: data.level,
            xp_to_next_level: data.xp_to_next_level,
            xp_history: data.xp_history || [],
            recent_gains: data.recent_gains || [],
          };
          
          logger.info("XP data loaded from database", { 
            userId: user.id, 
            totalXP: data.total_xp, 
            level: data.level 
          });
          
          // Update state with database data
          setXPData(dbData);
          
          // Cache to localStorage for this user (store user ID too)
          setLocalXPData({
            userId: user.id, // Store user ID to detect user changes
            totalXP: data.total_xp,
            level: data.level,
            xpToNextLevel: data.xp_to_next_level,
            xpHistory: data.xp_history || [],
            recentGains: data.recent_gains || [],
          });
        } else {
          logger.warn("No XP data found in database", { userId: user.id });
        }
      } catch (error) {
        logger.error("Error loading XP data from database", { error, userId: user.id });
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
  }, [user?.id, activeProfile?.id]); // Only depend on IDs, not full objects

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
          await updateXPData(user.id, updatedData, activeProfile?.id || null);
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

