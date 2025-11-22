"use client";

import { useEffect } from "react";
import { useGlobalToast } from "@/contexts/ToastContext";
import { eventBus, type EcosystemEvent } from "@/lib/eventBus";
import { ALL_ACHIEVEMENTS } from "@/services/achievementService";

/**
 * Listens for global events and shows toasts
 * Must be a child of ToastProvider
 */
export default function NotificationListener() {
  const { showToast } = useGlobalToast();

  useEffect(() => {
    // Subscribe to EventBus for achievement unlocks
    const unsubAchievement = eventBus.on("achievement_unlocked", (event: EcosystemEvent) => {
      const { achievementId, title, description } = event.data || {};

      // Try to find the achievement details
      const achievement = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);

      showToast(
        description || achievement?.description || "Great job!",
        "achievement",
        5000,
        title || achievement?.name || "Achievement Unlocked!"
      );
    });

    // Subscribe to EventBus for goal completion
    const unsubGoal = eventBus.on("goal_completed", (event: EcosystemEvent) => {
      const { goalType, targetSubject } = event.data || {};

      showToast(
        `Goal completed: ${targetSubject || goalType || "Learning goal"}`,
        "success",
        5000,
        "Goal Achieved!"
      );
    });

    // Listen for legacy window events (for backward compatibility)
    const handleAchievement = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;

      // Handle both old format (string) and new format (object)
      if (typeof detail === "string") {
        showToast(`Unlocked: ${detail}`, "achievement", 5000, "Achievement Unlocked!");
      } else {
        showToast(
          detail.message || "Great job!",
          "achievement",
          5000,
          detail.title || "Achievement Unlocked!"
        );
      }
    };

    // Listen for XP gain events
    const handleXPGain = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { xp, reason, levelUp, newLevel } = customEvent.detail || {};

      if (levelUp) {
        showToast(
          `You are now Level ${newLevel}!`,
          "success",
          5000,
          "Level Up!"
        );
      } else if (xp) {
        showToast(`+${xp} XP - ${reason || "Keep it up!"}`, "success", 3000);
      }
    };

    // Listen for streak events
    const handleStreak = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { streak } = customEvent.detail || {};

      if (streak && streak > 1) {
        showToast(`${streak} day streak! Keep going!`, "success", 4000);
      }
    };

    // Listen for error events
    const handleError = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { message } = customEvent.detail || {};

      if (message) {
        showToast(message, "error", 5000);
      }
    };

    window.addEventListener("achievementUnlocked", handleAchievement);
    window.addEventListener("xpGained", handleXPGain);
    window.addEventListener("streakUpdated", handleStreak);
    window.addEventListener("appError", handleError);

    return () => {
      // Unsubscribe from EventBus
      unsubAchievement();
      unsubGoal();

      // Remove window event listeners
      window.removeEventListener("achievementUnlocked", handleAchievement);
      window.removeEventListener("xpGained", handleXPGain);
      window.removeEventListener("streakUpdated", handleStreak);
      window.removeEventListener("appError", handleError);
    };
  }, [showToast]);

  return null;
}
