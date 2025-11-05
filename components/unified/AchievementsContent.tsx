"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

const allAchievements: Achievement[] = [
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
 * Achievements Content - Display unlocked and locked achievements
 */
export default function AchievementsContent() {
  const [unlockedAchievements, setUnlockedAchievements] = useLocalStorage<string[]>("aitutor-achievements", []);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  // Check for new achievements
  useEffect(() => {
    // Listen for achievement events
    const handleAchievementUnlocked = (event: CustomEvent) => {
      const achievementId = event.detail;
      const achievement = allAchievements.find(a => a.id === achievementId);
      
      if (achievement && !unlockedAchievements.includes(achievementId)) {
        setUnlockedAchievements([...unlockedAchievements, achievementId]);
        setNewAchievement(achievement);
        setTimeout(() => setNewAchievement(null), 5000);
      }
    };

    window.addEventListener("achievementUnlocked", handleAchievementUnlocked as EventListener);
    return () => window.removeEventListener("achievementUnlocked", handleAchievementUnlocked as EventListener);
  }, [unlockedAchievements, setUnlockedAchievements]);

  const unlocked = allAchievements.filter(a => unlockedAchievements.includes(a.id));
  const locked = allAchievements.filter(a => !unlockedAchievements.includes(a.id));

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* New Achievement Toast */}
      {newAchievement && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-500 rounded-lg shadow-lg p-4 animate-in fade-in slide-in-from-bottom-2 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{newAchievement.icon}</span>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100 transition-colors">Achievement Unlocked!</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">{newAchievement.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">{newAchievement.description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
          Progress: {unlocked.length} / {allAchievements.length} unlocked
        </p>
        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
          <div
            className="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-300"
            style={{ width: `${(unlocked.length / allAchievements.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Unlocked ({unlocked.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {unlocked.length === 0 ? (
              <div className="col-span-full text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                No achievements unlocked yet. Keep practicing!
              </div>
            ) : (
              unlocked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-500 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-1">{achievement.icon}</div>
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100 transition-colors">{achievement.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 transition-colors">{achievement.description}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {locked.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Locked ({locked.length})</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {locked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-center opacity-60 transition-colors"
                >
                  <div className="text-2xl mb-1 grayscale">{achievement.icon}</div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors">???</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

