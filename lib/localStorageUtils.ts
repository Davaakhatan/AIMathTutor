/**
 * Utility functions for managing localStorage data
 * Handles clearing user-specific data when logging in/out
 */

/**
 * List of all localStorage keys used by the app
 */
export const LOCAL_STORAGE_KEYS = {
  SETTINGS: "aitutor-settings",
  PROBLEM_HISTORY: "aitutor-problem-history",
  BOOKMARKS: "aitutor-bookmarks",
  XP_DATA: "aitutor-xp",
  STREAK_DATA: "aitutor-streak",
  STUDY_SESSIONS: "aitutor-study-sessions",
  DAILY_GOALS: "aitutor-daily-goals",
  ACHIEVEMENTS: "aitutor-achievements",
  LEADERBOARD: "aitutor-leaderboard",
  LAST_STUDY: "aitutor-last-study",
  NOTIFICATIONS: "aitutor-notifications",
  // Legacy keys (can be removed)
  USER_ID: "aitutor-user-id",
  USERNAME: "aitutor-username",
} as const;

/**
 * User-specific data keys that should be cleared on login
 * (These are the keys that contain user progress/data)
 */
export const USER_DATA_KEYS = [
  LOCAL_STORAGE_KEYS.PROBLEM_HISTORY,
  LOCAL_STORAGE_KEYS.BOOKMARKS,
  LOCAL_STORAGE_KEYS.XP_DATA,
  LOCAL_STORAGE_KEYS.STREAK_DATA,
  LOCAL_STORAGE_KEYS.STUDY_SESSIONS,
  LOCAL_STORAGE_KEYS.DAILY_GOALS,
  LOCAL_STORAGE_KEYS.ACHIEVEMENTS,
  LOCAL_STORAGE_KEYS.LEADERBOARD,
  LOCAL_STORAGE_KEYS.LAST_STUDY,
  LOCAL_STORAGE_KEYS.NOTIFICATIONS,
  LOCAL_STORAGE_KEYS.USER_ID,
  LOCAL_STORAGE_KEYS.USERNAME,
] as const;

/**
 * Keys that should be preserved (like settings, UI state)
 */
export const PRESERVED_KEYS = [
  LOCAL_STORAGE_KEYS.SETTINGS,
] as const;

/**
 * Clear all user-specific data from localStorage
 * This is called when a user logs in to start fresh with database data
 */
export function clearUserData(): void {
  if (typeof window === "undefined") return;

  try {
    USER_DATA_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log("Cleared user-specific localStorage data");
  } catch (error) {
    console.error("Error clearing localStorage data:", error);
  }
}

/**
 * Clear all localStorage data (including settings)
 * Use with caution - this will reset everything
 */
export function clearAllData(): void {
  if (typeof window === "undefined") return;

  try {
    Object.values(LOCAL_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log("Cleared all localStorage data");
  } catch (error) {
    console.error("Error clearing all localStorage data:", error);
  }
}

/**
 * Get all localStorage data as an object (for backup/export)
 */
export function getAllLocalStorageData(): Record<string, any> {
  if (typeof window === "undefined") return {};

  const data: Record<string, any> = {};
  
  Object.values(LOCAL_STORAGE_KEYS).forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  });

  return data;
}

/**
 * Check if localStorage has any user data
 */
export function hasUserData(): boolean {
  if (typeof window === "undefined") return false;

  return USER_DATA_KEYS.some((key) => {
    const value = localStorage.getItem(key);
    return value !== null && value !== "[]" && value !== "{}" && value !== "0";
  });
}

