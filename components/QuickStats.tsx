"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProblemHistory } from "@/hooks/useProblemHistory";

interface QuickStatsProps {
  compact?: boolean;
}

/**
 * Quick stats widget - shows key metrics at a glance
 */
export default function QuickStats({ compact = false }: QuickStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [xpData] = useLocalStorage<any>("aitutor-xp", { totalXP: 0, level: 1 });
  const [streakData] = useLocalStorage<any>("aitutor-streak", { currentStreak: 0, longestStreak: 0 });
  const { problems: savedProblems } = useProblemHistory();

  const stats = {
    level: xpData.level || 1,
    xp: xpData.totalXP || 0,
    streak: streakData.currentStreak || 0,
    problemsSolved: savedProblems.length || 0,
  };

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 left-4 z-40 hidden sm:block bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:from-blue-600 hover:to-purple-600 active:scale-95 transition-all min-h-[44px] touch-device:min-h-[48px]"
        aria-label="Quick stats"
        title="Quick Stats"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span className="text-sm font-medium">Lv {stats.level}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 hidden sm:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-48 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide transition-colors">
          Quick Stats
        </h4>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Minimize"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded transition-colors">
          <p className="text-blue-600 dark:text-blue-400 font-medium transition-colors">Level</p>
          <p className="text-blue-900 dark:text-blue-100 text-lg font-bold transition-colors">{stats.level}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded transition-colors">
          <p className="text-purple-600 dark:text-purple-400 font-medium transition-colors">XP</p>
          <p className="text-purple-900 dark:text-purple-100 text-lg font-bold transition-colors">
            {stats.xp.toLocaleString()}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded transition-colors">
          <p className="text-orange-600 dark:text-orange-400 font-medium transition-colors">Streak</p>
          <p className="text-orange-900 dark:text-orange-100 text-lg font-bold transition-colors">
            {stats.streak} days
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded transition-colors">
          <p className="text-green-600 dark:text-green-400 font-medium transition-colors">Solved</p>
          <p className="text-green-900 dark:text-green-100 text-lg font-bold transition-colors">
            {stats.problemsSolved}
          </p>
        </div>
      </div>
    </div>
  );
}

