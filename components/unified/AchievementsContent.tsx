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
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Achievements
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Unlock badges by completing challenges
        </p>
      </div>

      {/* New Achievement Toast */}
      {newAchievement && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-300 dark:border-purple-700 rounded-2xl shadow-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
              <div className="w-12 h-12 text-white">
                <AchievementIcon achievementId={newAchievement.id} className="w-full h-full" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-bold text-purple-900 dark:text-purple-100 text-lg">🎉 Achievement Unlocked!</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{newAchievement.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{newAchievement.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Card */}
      <div className="mb-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Overall Progress</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {unlocked.length} of {allAchievements.length} achievements unlocked
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {Math.round((unlocked.length / allAchievements.length) * 100)}%
            </p>
          </div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${(unlocked.length / allAchievements.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* Unlocked Achievements */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unlocked ({unlocked.length})</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlocked.length === 0 ? (
              <div className="col-span-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No achievements yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Solve problems to unlock badges!</p>
              </div>
            ) : (
              unlocked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="p-3 space-y-2">
                    {/* Icon */}
                    <div className="flex justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                        <div className="w-8 h-8 text-white">
                          <AchievementIcon achievementId={achievement.id} className="w-full h-full" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Text */}
                    <div className="text-center">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-0.5 line-clamp-1">{achievement.name}</h5>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight">{achievement.description}</p>
                    </div>
                    
                    {/* Share Button */}
                    {user && (
                      <ShareCard
                        shareType="achievement"
                        metadata={{
                          achievement_title: achievement.name,
                          achievement_type: achievement.id,
                        }}
                        className="text-[10px] px-2 py-1 w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Locked Achievements */}
        {locked.length > 0 && (
          <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-gray-400 to-gray-500"></div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Locked ({locked.length})</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {locked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md opacity-60"
                >
                  <div className="p-3 space-y-2">
                    {/* Locked Icon with Lock Overlay */}
                    <div className="flex justify-center">
                      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center relative">
                        <div className="w-8 h-8 text-gray-500 dark:text-gray-600 blur-sm">
                          <AchievementIcon achievementId={achievement.id} className="w-full h-full" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Text */}
                    <div className="text-center">
                      <h5 className="text-xs font-bold text-gray-500 dark:text-gray-500">???</h5>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-tight">Locked</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

