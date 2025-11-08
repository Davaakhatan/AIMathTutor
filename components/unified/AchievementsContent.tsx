"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAchievements } from "@/hooks/useAchievements";
import { useProblemHistory } from "@/hooks/useProblemHistory";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_ACHIEVEMENTS, checkAchievements, type Achievement } from "@/services/achievementService";
import ShareCard from "@/components/ShareCard";
import AchievementIcon from "@/components/achievements/AchievementIcon";

const allAchievements = ALL_ACHIEVEMENTS;

/**
 * Achievements Content - Display unlocked and locked achievements
 */
export default function AchievementsContent() {
  const { user } = useAuth();
  const { unlockedAchievements, unlockAchievement } = useAchievements();
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [xpData] = useLocalStorage<any>("aitutor-xp", { totalXP: 0, level: 1, problemsSolved: 0 });
  const [streakData] = useLocalStorage<any>("aitutor-streak", { currentStreak: 0 });
  const { problems: problemHistory } = useProblemHistory();

  // Check achievements periodically based on stats
  useEffect(() => {
    // Calculate problems solved from problem history (more reliable than xpData.problemsSolved)
    const problemsSolved = problemHistory.length || 0;
    
    // Get problem types from history
    const problemTypes = problemHistory.map((p: any) => p.type || p.problem_type || "unknown").filter(Boolean);
    
    const stats = {
      problemsSolved: problemsSolved,
      currentStreak: streakData?.currentStreak || 0,
      hintsUsed: 0, // TODO: Track hints used
      problemTypes: problemTypes,
      voiceUsageCount: 0, // TODO: Track voice usage
      whiteboardUsageCount: 0, // TODO: Track whiteboard usage
    };

    console.log("[AchievementsContent] Checking achievements with stats:", stats);
    console.log("[AchievementsContent] Current unlocked:", unlockedAchievements);

    const newlyUnlocked = checkAchievements(unlockedAchievements, stats);
    
    console.log("[AchievementsContent] Newly unlocked:", newlyUnlocked);
    
    if (newlyUnlocked.length > 0) {
      console.log("[AchievementsContent] Unlocking achievements:", newlyUnlocked);
      newlyUnlocked.forEach(achievementId => {
        const achievement = allAchievements.find(a => a.id === achievementId);
        if (achievement && !unlockedAchievements.includes(achievementId)) {
          unlockAchievement(achievementId);
          setNewAchievement(achievement);
          setTimeout(() => setNewAchievement(null), 5000);
          // Dispatch event
          window.dispatchEvent(
            new CustomEvent("achievementUnlocked", {
              detail: achievementId,
            })
          );
          console.log("[AchievementsContent] Unlocked achievement:", achievementId, achievement.name);
        }
      });
    }
  }, [problemHistory.length, streakData?.currentStreak, unlockedAchievements, unlockAchievement]);

  // Listen for achievement events (from other components)
  useEffect(() => {
    const handleAchievementUnlocked = (event: CustomEvent) => {
      const achievementId = typeof event.detail === 'string' ? event.detail : event.detail?.id;
      if (!achievementId) return;
      
      const achievement = allAchievements.find(a => a.id === achievementId);
      
      if (achievement && !unlockedAchievements.includes(achievementId)) {
        unlockAchievement(achievementId);
        setNewAchievement(achievement);
        setTimeout(() => setNewAchievement(null), 5000);
      }
    };

    window.addEventListener("achievementUnlocked", handleAchievementUnlocked as EventListener);
    return () => window.removeEventListener("achievementUnlocked", handleAchievementUnlocked as EventListener);
  }, [unlockedAchievements, unlockAchievement]);

  const unlocked = allAchievements.filter(a => unlockedAchievements.includes(a.id));
  const locked = allAchievements.filter(a => !unlockedAchievements.includes(a.id));

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* New Achievement Toast */}
      {newAchievement && (
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 animate-in fade-in slide-in-from-bottom-2 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <AchievementIcon achievementId={newAchievement.id} className="w-full h-full" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 transition-colors">Achievement Unlocked</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors">{newAchievement.name}</p>
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
                  className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-center transition-colors hover:border-indigo-300 dark:hover:border-indigo-600"
                >
                  <div className="flex justify-center mb-2">
                    <div className="w-10 h-10 text-indigo-600 dark:text-indigo-400">
                      <AchievementIcon achievementId={achievement.id} className="w-full h-full" />
                    </div>
                  </div>
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100 transition-colors mb-1">{achievement.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors mb-3">{achievement.description}</div>
                  {user && (
                    <div className="mt-2">
                      <ShareCard
                        shareType="achievement"
                        metadata={{
                          achievement_title: achievement.name,
                          achievement_type: achievement.id,
                        }}
                        className="text-xs px-3 py-1.5 w-full"
                      />
                    </div>
                  )}
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
                  className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center opacity-50 transition-colors"
                >
                  <div className="flex justify-center mb-2">
                    <div className="w-10 h-10 text-gray-400 dark:text-gray-600">
                      <AchievementIcon achievementId={achievement.id} className="w-full h-full" />
                    </div>
                  </div>
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500 transition-colors">Locked</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

