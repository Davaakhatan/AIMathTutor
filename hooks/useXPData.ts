"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalStorage } from "./useLocalStorage";
import { logger } from "@/lib/logger";

// XPData type for internal use
interface XPData {
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  xp_history: any[];
  recent_gains: any[];
}

// Fetch XP from v2 API
async function fetchXPFromAPI(userId: string, profileId: string | null): Promise<XPData | null> {
  try {
    const url = profileId
      ? `/api/v2/xp?userId=${userId}&profileId=${profileId}`
      : `/api/v2/xp?userId=${userId}`;

    const response = await fetch(url);
    if (!response.ok) {
      logger.error("Failed to fetch XP from API", { status: response.status });
      return null;
    }

    const result = await response.json();
    if (result.success && result.xpData) {
      return {
        total_xp: result.xpData.totalXP || 0,
        level: result.xpData.level || 1,
        xp_to_next_level: result.xpData.xpToNextLevel || 100,
        xp_history: result.xpData.xpHistory || [],
        recent_gains: result.xpData.recentGains || [],
      };
    }
    return null;
  } catch (error) {
    logger.error("Error fetching XP from API", { error });
    return null;
  }
}

// Update XP via v2 API
async function updateXPViaAPI(
  userId: string,
  xpData: XPData,
  profileId: string | null
): Promise<boolean> {
  try {
    const response = await fetch("/api/v2/xp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        profileId,
        action: "update",
        totalXP: xpData.total_xp,
        level: xpData.level,
        xpToNextLevel: xpData.xp_to_next_level,
        xpHistory: xpData.xp_history,
      }),
    });

    return response.ok;
  } catch (error) {
    logger.error("Error updating XP via API", { error });
    return false;
  }
}

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
  
  // Listen for manual sync events from XPContent
  useEffect(() => {
    const handleXPSync = (event: CustomEvent) => {
      const syncedData = event.detail;
      if (syncedData) {
        logger.info("XP sync event received, updating state", { 
          totalXP: syncedData.totalXP, 
          level: syncedData.level 
        });
        // Update internal state directly
        setXPData({
          total_xp: syncedData.totalXP,
          level: syncedData.level,
          xp_to_next_level: syncedData.xpToNextLevel || 100,
          xp_history: syncedData.xpHistory || [],
          recent_gains: syncedData.recentGains || [],
        });
        // Also update localStorage (should already be updated, but ensure it)
        setLocalXPData(syncedData);
      }
    };
    
    // Listen for referral reward events to trigger XP refresh
    const handleReferralReward = async () => {
      if (user) {
        logger.info("Referral reward event received, refreshing XP", { userId: user.id });
        try {
          const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
          const freshData = await fetchXPFromAPI(user.id, profileIdToUse);
          if (freshData) {
            setXPData(freshData);
            setLocalXPData({
              totalXP: freshData.total_xp,
              level: freshData.level,
              xpToNextLevel: freshData.xp_to_next_level,
              xpHistory: freshData.xp_history || [],
              recentGains: freshData.recent_gains || [],
            });
            logger.info("XP refreshed after referral reward", {
              totalXP: freshData.total_xp,
              level: freshData.level
            });
          }
        } catch (error) {
          logger.error("Error refreshing XP after referral reward", { error });
        }
      }
    };
    
    window.addEventListener('xp-sync-complete', handleXPSync as EventListener);
    window.addEventListener('referral_reward_awarded', handleReferralReward as EventListener);
    return () => {
      window.removeEventListener('xp-sync-complete', handleXPSync as EventListener);
      window.removeEventListener('referral_reward_awarded', handleReferralReward as EventListener);
    };
  }, [setLocalXPData, user, userRole, activeProfile?.id]);

  // Load XP data - Fetch from database for authenticated users
  useEffect(() => {
    let isMounted = true;
    
    logger.debug("useXPData hook effect running", { 
      hasUser: !!user, 
      userId: user?.id, 
      userRole,
      localXPTotal: localXPData.totalXP 
    });
    
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
      logger.debug("No user - using localStorage only", { localXPTotal: localData.total_xp });
      return;
    }

    // For authenticated users: Load from database in BACKGROUND
    const loadFromDatabase = async () => {
      try {
        // Don't set loading true - we already showed localStorage data
        
        // CRITICAL: For student users, ALWAYS use user-level XP (profileId = null)
        // For parents/teachers, use activeProfile if set
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
        
        logger.info("Loading XP from database", { 
          userId: user.id, 
          profileId: profileIdToUse, 
          userRole,
          currentLocalXP: localXPData.totalXP 
        });
        
        // If localStorage has 0 XP, try to fetch immediately (don't wait for timeout)
        // This ensures we get the correct XP even if the first query is slow
        if (localXPData.totalXP === 0 && localXPData.level === 1) {
          logger.info("localStorage has default values (0 XP) - fetching immediately", { userId: user.id });
        }
        
        // Add timeout wrapper to prevent hanging forever
        const timeoutMs = 5000; // 5 seconds max
        const dataPromise = fetchXPFromAPI(user.id, profileIdToUse);
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => {
            logger.warn("XP query timeout, falling back to localStorage", { userId: user.id });
            resolve(null);
          }, timeoutMs)
        );
        
        const data = await Promise.race([dataPromise, timeoutPromise]);
        
        if (!isMounted) return;
        
        if (data) {
          logger.info("XP data loaded from database", { 
            userId: user.id, 
            totalXP: data.total_xp, 
            level: data.level 
          });
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
          // Query timed out or no data - check if we should retry or use localStorage
          logger.warn("XP query timed out or no data - checking if we should retry", { userId: user.id });
          
          // If localStorage has old data (0 XP), try to fetch once more without timeout wrapper
          // This handles the case where the first query times out but a retry might work
          if (localXPData.totalXP === 0 && localXPData.level === 1) {
            logger.info("localStorage has default values, attempting one more fetch", { userId: user.id });
            try {
              // Try one more time with a shorter timeout (3 seconds)
              const retryPromise = fetchXPFromAPI(user.id, profileIdToUse);
              const retryTimeout = new Promise<null>((resolve) => 
                setTimeout(() => resolve(null), 3000)
              );
              const retryData = await Promise.race([retryPromise, retryTimeout]);
              
              if (retryData) {
                logger.info("Retry succeeded! Loading XP from database", { 
                  userId: user.id, 
                  totalXP: retryData.total_xp 
                });
                setXPData(retryData);
                setLocalXPData({
                  totalXP: retryData.total_xp,
                  level: retryData.level,
                  xpToNextLevel: retryData.xp_to_next_level,
                  xpHistory: retryData.xp_history || [],
                  recentGains: retryData.recent_gains || [],
                });
              } else {
                logger.warn("Retry also timed out - keeping localStorage", { userId: user.id });
              }
            } catch (retryError) {
              logger.error("Retry failed", { error: retryError, userId: user.id });
            }
          } else {
            logger.warn("No XP data in database, keeping localStorage", { userId: user.id });
          }
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
  
  // SEPARATE EFFECT: Poll for XP updates periodically
  // This is safer than event listeners which can cause infinite loops
  useEffect(() => {
    if (!user || !xpData) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
        const freshData = await fetchXPFromAPI(user.id, profileIdToUse);
        
        // Update if XP, level, or recentGains changed
        if (freshData && xpData) {
          const xpChanged = freshData.total_xp !== xpData.total_xp;
          const levelChanged = freshData.level !== xpData.level;
          const recentGainsChanged = JSON.stringify(freshData.recent_gains) !== JSON.stringify(xpData.recent_gains);
          
          if (xpChanged || levelChanged || recentGainsChanged) {
            logger.debug("XP/Level/RecentGains changed, updating display", { 
              xpChanged,
              levelChanged,
              recentGainsChanged,
              oldXP: xpData.total_xp, 
              newXP: freshData.total_xp,
              oldRecentGainsCount: xpData.recent_gains?.length || 0,
              newRecentGainsCount: freshData.recent_gains?.length || 0
            });
            setXPData(freshData);
            
            // Update localStorage
            setLocalXPData({
              totalXP: freshData.total_xp,
              level: freshData.level,
              xpToNextLevel: freshData.xp_to_next_level,
              xpHistory: freshData.xp_history || [],
              recentGains: freshData.recent_gains || [],
            });
          }
        }
      } catch (error) {
        // Silent fail - don't spam logs
      }
    }, 2000); // Poll every 2 seconds
    
    return () => clearInterval(pollInterval);
  }, [user?.id, userRole, xpData?.total_xp, activeProfile?.id, setLocalXPData, xpData]);

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
          const success = await updateXPViaAPI(user.id, updatedData, profileIdToUse);
          if (!success) {
            throw new Error("Failed to update XP via API");
          }
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

