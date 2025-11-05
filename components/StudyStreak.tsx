"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: number;
}

export default function StudyStreak() {
  const [streakData, setStreakData] = useLocalStorage<StreakData>("aitutor-streak", {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: 0,
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Only render after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update streak when user starts a problem
  useEffect(() => {
    const updateStreak = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      const lastDate = new Date(streakData.lastStudyDate);
      lastDate.setHours(0, 0, 0, 0);
      const lastDateTimestamp = lastDate.getTime();

      const daysDiff = Math.floor((todayTimestamp - lastDateTimestamp) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Already studied today, keep streak
        return;
      } else if (daysDiff === 1) {
        // Continue streak (yesterday -> today)
        setStreakData({
          currentStreak: streakData.currentStreak + 1,
          longestStreak: Math.max(streakData.longestStreak, streakData.currentStreak + 1),
          lastStudyDate: todayTimestamp,
        });
      } else if (streakData.lastStudyDate === 0) {
        // First time studying
        setStreakData({
          currentStreak: 1,
          longestStreak: 1,
          lastStudyDate: todayTimestamp,
        });
      } else {
        // Streak broken (missed days), start new
        setStreakData({
          currentStreak: 1,
          longestStreak: streakData.longestStreak,
          lastStudyDate: todayTimestamp,
        });
      }
    };

    // Listen for problem started event
    const handleProblemStarted = () => {
      updateStreak();
    };

    window.addEventListener("problemStarted", handleProblemStarted);
    
    // Also check on mount
    try {
      const history = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const hasTodayStudy = history.some((p: any) => {
        const savedDate = new Date(p.savedAt);
        savedDate.setHours(0, 0, 0, 0);
        return savedDate.getTime() === today.getTime();
      });

      if (hasTodayStudy && streakData.lastStudyDate !== today.getTime()) {
        updateStreak();
      }
    } catch {
      // Ignore
    }

    return () => window.removeEventListener("problemStarted", handleProblemStarted);
  }, [streakData, setStreakData]);

  // Don't render until after hydration to avoid hydration mismatch
  if (!isMounted) return null;

  if (streakData.currentStreak === 0) return null;

      return (
        <div className="fixed top-4 left-4 z-40 hidden sm:block">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all min-h-[44px] touch-device:min-h-[48px]"
            aria-label="Study streak"
          >
        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
          {streakData.currentStreak} day{streakData.currentStreak !== 1 ? "s" : ""}
        </span>
      </button>

      {showDetails && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-64 transition-colors">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 transition-colors">Current Streak</p>
              <p className="text-2xl font-light text-gray-900 dark:text-gray-100 transition-colors">{streakData.currentStreak} days</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 transition-colors">Longest Streak</p>
              <p className="text-xl font-light text-gray-900 dark:text-gray-100 transition-colors">{streakData.longestStreak} days</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700 transition-colors">
              Keep practicing daily to maintain your streak!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

