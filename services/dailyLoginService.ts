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

/**
 * Check if user should receive daily login XP
 * Awards XP if it's a new day since last login
 * Also awards bonus XP on first login after signup
 * TEMPORARILY DISABLED - causing duplicate key errors
 */
export async function checkAndAwardDailyLoginXP(
  userId: string,
  profileId?: string | null
): Promise<{ awarded: boolean; xp: number; message: string }> {
  // TEMPORARILY DISABLED - will fix XP system properly
  return {
    awarded: false,
    xp: 0,
    message: "Daily login XP temporarily disabled",
  };
  
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
    
    // Check if this is the first login (no last login date)
    const isFirstLogin = !lastLoginDate && !firstLoginBonusClaimed;
    
    // If already logged in today (and not first login), no reward
    if (lastLoginDate === today && !isFirstLogin) {
      logger.debug("Daily login XP already awarded today", { userId, today });
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
    
    // Get current XP data
    const currentXP = await getXPData(userId, profileId);
    if (!currentXP) {
      logger.warn("Could not get current XP data for daily login reward", { userId });
      return {
        awarded: false,
        xp: 0,
        message: "Could not fetch XP data",
      };
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

