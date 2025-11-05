"use client";

import { useState, useEffect, useRef } from "react";
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

export default function AchievementBadge() {
  const [unlockedAchievements, setUnlockedAchievements] = useLocalStorage<string[]>("aitutor-achievements", []);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Check for new achievements
  useEffect(() => {
    const checkAchievements = () => {
      // This would be called by the app when achievements are unlocked
      // For now, we'll just show the badge
    };

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
    <>
      {/* New Achievement Toast */}
      {newAchievement && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border-2 border-yellow-400 dark:border-yellow-500 rounded-lg shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 transition-colors">
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

      {/* Achievement Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-40 bg-purple-600 text-white rounded-full p-3 shadow-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
        style={{ bottom: "25rem" }}
        aria-label="View achievements"
        title="Achievements"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        {unlocked.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unlocked.length}
          </span>
        )}
      </button>

      {/* Achievement Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div 
            ref={panelRef}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto transition-colors"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between transition-colors">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">Achievements</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
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
                    {unlocked.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-500 rounded-lg text-center transition-colors"
                      >
                        <div className="text-2xl mb-1">{achievement.icon}</div>
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 transition-colors">{achievement.name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 transition-colors">{achievement.description}</div>
                      </div>
                    ))}
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
          </div>
        </div>
      )}
    </>
  );
}

