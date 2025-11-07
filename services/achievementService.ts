/**
 * Achievement Service
 * Checks conditions and unlocks achievements automatically
 */

import { logger } from "@/lib/logger";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_problem", name: "Getting Started", description: "Solved your first problem", icon: "🎯" },
  { id: "streak_3", name: "On Fire", description: "3-day study streak", icon: "🔥" },
  { id: "streak_7", name: "Week Warrior", description: "7-day study streak", icon: "⭐" },
  { id: "streak_30", name: "Dedicated", description: "30-day study streak", icon: "🏆" },
  { id: "problems_10", name: "Problem Solver", description: "Solved 10 problems", icon: "💪" },
  { id: "problems_50", name: "Math Master", description: "Solved 50 problems", icon: "👑" },
  { id: "no_hints", name: "Independent", description: "Solved a problem without hints", icon: "🧠" },
  { id: "voice_user", name: "Voice Learner", description: "Used voice interface 10 times", icon: "🎤" },
  { id: "whiteboard_user", name: "Visual Thinker", description: "Used whiteboard 5 times", icon: "✏️" },
  { id: "all_types", name: "Versatile", description: "Solved problems of all types", icon: "🌟" },
];

/**
 * Check and unlock achievements based on user progress
 */
export function checkAchievements(
  unlockedAchievements: string[],
  stats: {
    problemsSolved: number;
    currentStreak: number;
    hintsUsed: number;
    problemTypes: string[];
    voiceUsageCount?: number;
    whiteboardUsageCount?: number;
  }
): string[] {
  const newlyUnlocked: string[] = [];

  // Check each achievement condition
  for (const achievement of ALL_ACHIEVEMENTS) {
    // Skip if already unlocked
    if (unlockedAchievements.includes(achievement.id)) {
      continue;
    }

    let shouldUnlock = false;

    switch (achievement.id) {
      case "first_problem":
        shouldUnlock = stats.problemsSolved >= 1;
        break;
      case "problems_10":
        shouldUnlock = stats.problemsSolved >= 10;
        break;
      case "problems_50":
        shouldUnlock = stats.problemsSolved >= 50;
        break;
      case "streak_3":
        shouldUnlock = stats.currentStreak >= 3;
        break;
      case "streak_7":
        shouldUnlock = stats.currentStreak >= 7;
        break;
      case "streak_30":
        shouldUnlock = stats.currentStreak >= 30;
        break;
      case "no_hints":
        shouldUnlock = stats.hintsUsed === 0 && stats.problemsSolved >= 1;
        break;
      case "voice_user":
        shouldUnlock = (stats.voiceUsageCount || 0) >= 10;
        break;
      case "whiteboard_user":
        shouldUnlock = (stats.whiteboardUsageCount || 0) >= 5;
        break;
      case "all_types":
        // Check if user has solved problems of multiple types
        const uniqueTypes = new Set(stats.problemTypes);
        shouldUnlock = uniqueTypes.size >= 5; // Adjust threshold as needed
        break;
    }

    if (shouldUnlock) {
      newlyUnlocked.push(achievement.id);
      logger.info("Achievement unlocked", { achievementId: achievement.id, achievementName: achievement.name });
    }
  }

  return newlyUnlocked;
}

/**
 * Unlock an achievement and dispatch event
 */
export function unlockAchievement(achievementId: string): void {
  // Dispatch event for UI to react
  window.dispatchEvent(
    new CustomEvent("achievementUnlocked", {
      detail: achievementId, // Send just the ID string
    })
  );
  logger.info("Achievement unlock event dispatched", { achievementId });
}

