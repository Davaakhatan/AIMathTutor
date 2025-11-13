/**
 * Daily Login Service
 * Handles daily login XP rewards and tracking
 */

import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { updateXPData, getXPData } from "./supabaseDataService";

const DAILY_LOGIN_XP = 10; // XP awarded for daily login
const FIRST_LOGIN_BONUS_XP = 50; // Bonus XP for first login after signup
const STORAGE_KEY = "aitutor-last-login-date";
const FIRST_LOGIN_KEY = "aitutor-first-login-bonus-claimed";

// Track in-flight requests to prevent concurrent calls
const inFlightRequests = new Map<string, Promise<{ awarded: boolean; xp: number; message: string }>>();

/**
 * Check if user should receive daily login XP
 * Awards XP if it's a new day since last login
 * Also awards bonus XP on first login after signup
 */
export async function checkAndAwardDailyLoginXP(
  userId: string,
  profileId?: string | null
): Promise<{ awarded: boolean; xp: number; message: string }> {
  // Prevent duplicate concurrent calls for same user
  const cacheKey = profileId ? `${userId}-${profileId}` : userId;
  
  if (inFlightRequests.has(cacheKey)) {
    logger.debug("Daily login check already in progress, waiting for result", { userId, profileId });
    return await inFlightRequests.get(cacheKey)!;
  }
  
  const promise = checkAndAwardDailyLoginXPInternal(userId, profileId);
  inFlightRequests.set(cacheKey, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

async function checkAndAwardDailyLoginXPInternal(
  userId: string,
  profileId?: string | null
): Promise<{ awarded: boolean; xp: number; message: string }> {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Check localStorage for last login date (for this profile)
    const storageKey = profileId 
      ? `${STORAGE_KEY}-${profileId}` 
      : `${STORAGE_KEY}-${userId}`;
    
    const firstLoginKey = profileId
      ? `${FIRST_LOGIN_KEY}-${profileId}`
      : `${FIRST_LOGIN_KEY}-${userId}`;
    
    const lastLoginDate = localStorage.getItem(storageKey);
    const firstLoginBonusClaimed = localStorage.getItem(firstLoginKey);
    
    // Also check XP history in database to see if bonuses were already claimed today
    // This prevents awarding twice if localStorage was cleared OR if called multiple times
    const existingXP = await getXPData(userId, profileId);
    const xpHistory = (existingXP?.xp_history || []) as Array<{ date: string; xp: number; reason: string }>;
    
    // Check if first login bonus was already awarded (ever)
    const hasFirstLoginInHistory = xpHistory.some(entry => 
      entry.reason && entry.reason.includes("First Login Bonus")
    );
    
    // Check if we already awarded login XP today
    const hasLoginXPToday = xpHistory.some(entry =>
      entry.date === today && entry.reason && (
        entry.reason.includes("Daily Login") || 
        entry.reason.includes("First Login")
      )
    );
    
    // If already awarded login XP today, skip
    if (hasLoginXPToday) {
      logger.debug("Daily login XP already awarded today (found in history)", { userId, today });
      return {
        awarded: false,
        xp: 0,
        message: "Already logged in today",
      };
    }
    
    // Check if this is the first login (no last login date AND no bonus in history)
    const isFirstLogin = !lastLoginDate && !firstLoginBonusClaimed && !hasFirstLoginInHistory;
    
    // Double-check localStorage (backup check)
    if (lastLoginDate === today && !isFirstLogin) {
      logger.debug("Daily login XP already awarded today (localStorage)", { userId, today });
      return {
        awarded: false,
        xp: 0,
        message: "Already logged in today",
      };
    }
    
    // Calculate XP to award
    let xpToAward = DAILY_LOGIN_XP;
    let reason = "Daily Login";
    
    if (isFirstLogin) {
      xpToAward += FIRST_LOGIN_BONUS_XP;
      reason = "First Login Bonus + Daily Login";
      logger.info("Awarding first login bonus XP", { 
        userId, 
        profileId, 
        xp: FIRST_LOGIN_BONUS_XP + DAILY_LOGIN_XP, 
        today 
      });
    } else {
      logger.info("Awarding daily login XP", { userId, profileId, xp: DAILY_LOGIN_XP, today });
    }
    
    // Use the existing XP data we already fetched
    // If XP data doesn't exist, create it first (for new users)
    let currentXP = existingXP;
    if (!currentXP) {
      logger.info("No XP data found, creating default XP data for new user", { userId, profileId });
      try {
        const { createDefaultXPData } = await import("./supabaseDataService");
        // Create default XP data (0 XP, level 1) for new user
        currentXP = await createDefaultXPData(userId, profileId);
        if (!currentXP) {
          logger.error("Failed to create default XP data for new user", { userId });
          return {
            awarded: false,
            xp: 0,
            message: "Could not create XP data",
          };
        }
        logger.info("Default XP data created for new user", { userId, totalXP: currentXP.total_xp, level: currentXP.level });
      } catch (error) {
        logger.error("Error creating default XP data", { error, userId });
        // Try one more time with getXPData which should also create it
        try {
          currentXP = await getXPData(userId, profileId);
          if (!currentXP) {
            return {
              awarded: false,
              xp: 0,
              message: "Could not create XP data",
            };
          }
        } catch (retryError) {
          logger.error("Retry also failed to create XP data", { error: retryError, userId });
          return {
            awarded: false,
            xp: 0,
            message: "Could not create XP data",
          };
        }
      }
    }
    
    // Calculate new XP and level
    const newTotalXP = currentXP.total_xp + xpToAward;
    const newLevel = calculateLevel(newTotalXP);
    const xpToNextLevel = calculateXPForLevel(newLevel + 1) - newTotalXP;
    
    // Update XP data
    const updateSuccess = await updateXPData(
      userId,
      {
        total_xp: newTotalXP,
        level: newLevel,
        xp_to_next_level: xpToNextLevel,
        xp_history: [
          ...currentXP.xp_history,
          {
            date: today,
            xp: xpToAward,
            reason,
          },
        ],
      },
      profileId
    );
    
    if (!updateSuccess) {
      logger.error("Failed to update XP for daily login", { userId });
      return {
        awarded: false,
        xp: 0,
        message: "Failed to update XP",
      };
    }
    
    // Update last login date in localStorage
    localStorage.setItem(storageKey, today);
    
    // Mark first login bonus as claimed if applicable
    if (isFirstLogin) {
      localStorage.setItem(firstLoginKey, "true");
    }
    
    logger.info("Daily login XP awarded successfully", { 
      userId, 
      profileId,
      xp: xpToAward, 
      newTotalXP, 
      newLevel,
      isFirstLogin
    });
    
    return {
      awarded: true,
      xp: xpToAward,
      message: isFirstLogin 
        ? `🎉 Welcome! +${xpToAward} XP (${FIRST_LOGIN_BONUS_XP} XP first login bonus + ${DAILY_LOGIN_XP} XP daily login)!`
        : `+${xpToAward} XP for logging in today! 🎉`,
    };
  } catch (error) {
    logger.error("Error in checkAndAwardDailyLoginXP", { error, userId });
    return {
      awarded: false,
      xp: 0,
      message: "Error awarding daily login XP",
    };
  }
}

/**
 * Calculate level from total XP
 * Level 1: 0-99 XP
 * Level 2: 100-249 XP
 * Level 3: 250-449 XP
 * etc. (exponential growth)
 */
function calculateLevel(totalXP: number): number {
  if (totalXP < 100) return 1;
  if (totalXP < 250) return 2;
  if (totalXP < 450) return 3;
  if (totalXP < 700) return 4;
  if (totalXP < 1000) return 5;
  if (totalXP < 1350) return 6;
  if (totalXP < 1750) return 7;
  if (totalXP < 2200) return 8;
  if (totalXP < 2700) return 9;
  if (totalXP < 3250) return 10;
  
  // After level 10, each level requires 600 more XP
  const xpAboveLevel10 = totalXP - 3250;
  const additionalLevels = Math.floor(xpAboveLevel10 / 600);
  return 10 + additionalLevels;
}

/**
 * Calculate XP required to reach a specific level
 */
function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 450;
  if (level === 5) return 700;
  if (level === 6) return 1000;
  if (level === 7) return 1350;
  if (level === 8) return 1750;
  if (level === 9) return 2200;
  if (level === 10) return 2700;
  if (level === 11) return 3250;
  
  // After level 11, each level requires 600 more XP
  return 3250 + (level - 11) * 600;
}

/**
 * Get days since last login
 */
export function getDaysSinceLastLogin(
  userId: string,
  profileId?: string | null
): number {
  try {
    const storageKey = profileId 
      ? `${STORAGE_KEY}-${profileId}` 
      : `${STORAGE_KEY}-${userId}`;
    
    const lastLoginDate = localStorage.getItem(storageKey);
    if (!lastLoginDate) {
      return 0; // First login
    }
    
    const today = new Date();
    const lastLogin = new Date(lastLoginDate);
    const diffTime = Math.abs(today.getTime() - lastLogin.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    logger.error("Error calculating days since last login", { error, userId });
    return 0;
  }
}

