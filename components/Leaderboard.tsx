"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  level: number;
  problemsSolved: number;
  streak: number;
  lastActive: number;
}

interface LeaderboardProps {
  currentXP: number;
  currentLevel: number;
  currentProblemsSolved: number;
  currentStreak: number;
}

/**
 * Leaderboard Component
 * Shows top performers and user's ranking
 * Note: This is a local leaderboard (client-side only)
 * For production, this would connect to a backend API
 */
export default function Leaderboard({
  currentXP,
  currentLevel,
  currentProblemsSolved,
  currentStreak,
}: LeaderboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useLocalStorage<LeaderboardEntry[]>("aitutor-leaderboard", []);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Update user entry in leaderboard (with ref to track previous values)
  const prevValuesRef = useRef({ 
    currentXP: 0, 
    currentLevel: 1, 
    currentProblemsSolved: 0, 
    currentStreak: 0 
  });

  useEffect(() => {
    // Only update if values actually changed
    if (
      prevValuesRef.current.currentXP === currentXP &&
      prevValuesRef.current.currentLevel === currentLevel &&
      prevValuesRef.current.currentProblemsSolved === currentProblemsSolved &&
      prevValuesRef.current.currentStreak === currentStreak
    ) {
      return; // No change, skip update
    }

    // Update ref
    prevValuesRef.current = {
      currentXP,
      currentLevel,
      currentProblemsSolved,
      currentStreak,
    };

    const userId = localStorage.getItem("aitutor-user-id") || `user-${Date.now()}`;
    if (!localStorage.getItem("aitutor-user-id")) {
      localStorage.setItem("aitutor-user-id", userId);
    }

    const username = localStorage.getItem("aitutor-username") || "You";

    const entry: LeaderboardEntry = {
      userId,
      username,
      totalXP: currentXP,
      level: currentLevel,
      problemsSolved: currentProblemsSolved,
      streak: currentStreak,
      lastActive: Date.now(),
    };

    setUserEntry(entry);

    // Update leaderboard (use functional setState to avoid dependency issues)
    setLeaderboard((prev) => {
      const updated = prev.filter((e) => e.userId !== userId);
      updated.push(entry);
      // Sort by XP (descending), then by problemsSolved, then by streak
      updated.sort((a, b) => {
        if (b.totalXP !== a.totalXP) return b.totalXP - a.totalXP;
        if (b.problemsSolved !== a.problemsSolved) return b.problemsSolved - a.problemsSolved;
        return b.streak - a.streak;
      });
      // Keep top 100
      return updated.slice(0, 100);
    });
  }, [currentXP, currentLevel, currentProblemsSolved, currentStreak, setLeaderboard]);

  // Calculate user rank
  useEffect(() => {
    if (!userEntry) return;

    const sorted = [...leaderboard].sort((a, b) => {
      if (b.totalXP !== a.totalXP) return b.totalXP - a.totalXP;
      if (b.problemsSolved !== a.problemsSolved) return b.problemsSolved - a.problemsSolved;
      return b.streak - a.streak;
    });

    const rank = sorted.findIndex((e) => e.userId === userEntry.userId) + 1;
    setUserRank(rank > 0 ? rank : null);
  }, [leaderboard, userEntry]);

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

  const topPlayers = leaderboard.slice(0, 10);
  const medals = ["🥇", "🥈", "🥉"];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 bg-indigo-600 dark:bg-indigo-700 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:ring-offset-2 touch-device:min-h-[48px] touch-device:min-w-[48px]"
        aria-label="Open leaderboard"
        title="Leaderboard"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div
        ref={panelRef}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto transition-colors"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between transition-colors">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">Leaderboard</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close leaderboard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* User's Rank */}
          {userRank && userEntry && (
            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1 transition-colors">Your Rank</p>
                  <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 transition-colors">#{userRank}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 transition-colors">{userEntry.username}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 transition-colors">
                    Level {userEntry.level} • {userEntry.totalXP.toLocaleString()} XP
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Players */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide transition-colors">Top Players</h4>
            <div className="space-y-2">
              {topPlayers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 transition-colors">
                  No players yet. Be the first to solve problems!
                </p>
              ) : (
                topPlayers.map((player, index) => (
                  <div
                    key={player.userId}
                    className={`p-3 rounded-lg border transition-colors ${
                      player.userId === userEntry?.userId
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center">
                          {index < 3 ? (
                            <span className="text-2xl">{medals[index]}</span>
                          ) : (
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 transition-colors">#{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium transition-colors ${
                            player.userId === userEntry?.userId
                              ? "text-indigo-900 dark:text-indigo-100"
                              : "text-gray-900 dark:text-gray-100"
                          }`}>
                            {player.username}
                            {player.userId === userEntry?.userId && " (You)"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                            Level {player.level} • {player.problemsSolved} solved • {player.streak} day streak
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 transition-colors">
                          {player.totalXP.toLocaleString()} XP
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors">
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
              💡 This is a local leaderboard. For a global leaderboard, connect to a backend service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

