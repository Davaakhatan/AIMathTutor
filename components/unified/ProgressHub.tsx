"use client";

import { useState, useEffect, useRef } from "react";
import { useProblemHistory } from "@/hooks/useProblemHistory";
import { useXPData } from "@/hooks/useXPData";
import { useStreakData } from "@/hooks/useStreakData";
import { useDailyGoals } from "@/hooks/useDailyGoals";
import { useStudySessions } from "@/hooks/useStudySessions";
import { StudySession } from "@/services/supabaseDataService";

interface DailyGoal {
  problems: number;
  time: number; // in minutes
  date: string; // YYYY-MM-DD
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: number;
}

interface ProgressHubProps {
  isStudyActive?: boolean;
  problemsSolvedToday?: number;
  timeSpentToday?: number; // in minutes
  onStreakChange?: (streak: number) => void;
  isGuestMode?: boolean;
  onSignUpClick?: () => void;
}

/**
 * Unified Progress Hub - Combines Stats, Goals, Timer, and Streak
 */
export default function ProgressHub({
  isStudyActive = false,
  problemsSolvedToday = 0,
  timeSpentToday = 0,
  onStreakChange,
  isGuestMode,
  onSignUpClick,
}: ProgressHubProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "goals" | "timer" | "streak">("stats");
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Stats - using database hooks
  const { xpData } = useXPData();
  const { streakData, updateStreak } = useStreakData();
  const { problems: savedProblems } = useProblemHistory();

  // Goals - using database hook
  const { todayGoal, updateGoal } = useDailyGoals();
  const [tempGoals, setTempGoals] = useState(() => ({ 
    problems: 5, 
    time: 30 
  }));

  // Timer - using database hook
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const { sessions, addSession, updateSession } = useStudySessions();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [problemsSolvedThisSession, setProblemsSolvedThisSession] = useState(0);

  // Set mounted state after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Stats from hooks
  const stats = {
    level: xpData.level || 1,
    xp: xpData.totalXP || 0,
    streak: streakData.currentStreak || 0,
    problemsSolved: savedProblems.length || 0,
  };

  // Update temp goals when todayGoal changes (only if values actually changed)
  useEffect(() => {
    const newProblems = todayGoal.problems_goal || 5;
    const newTime = todayGoal.time_goal || 30;
    if (tempGoals.problems !== newProblems || tempGoals.time !== newTime) {
      setTempGoals({ 
        problems: newProblems, 
        time: newTime 
      });
    }
  }, [todayGoal.problems_goal, todayGoal.time_goal]); // Only depend on the values, not the object

  const problemsProgress = Math.min(100, (problemsSolvedToday / (todayGoal.problems_goal || 5)) * 100);
  const timeProgress = Math.min(100, (timeSpentToday / (todayGoal.time_goal || 30)) * 100);
  const overallProgress = (problemsProgress + timeProgress) / 2;

  // Start timer when active
  useEffect(() => {
    if (isStudyActive && !isRunning) {
      startTimeRef.current = Date.now();
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else if (!isStudyActive && isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (startTimeRef.current) {
        const session = {
          start_time: new Date(startTimeRef.current).toISOString(),
          end_time: new Date().toISOString(),
          duration: elapsedTime,
          problems_solved: problemsSolvedThisSession,
          xp_earned: 0,
        } as StudySession;
        addSession(session);
        setElapsedTime(0);
        setProblemsSolvedThisSession(0);
      }
      setIsRunning(false);
      startTimeRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isStudyActive, isRunning, elapsedTime, problemsSolvedThisSession, addSession]);

  // Listen for problem solved events
  useEffect(() => {
    const handleProblemSolved = () => {
      setProblemsSolvedThisSession((prev) => prev + 1);
    };

    window.addEventListener("problemSolved", handleProblemSolved);
    return () => window.removeEventListener("problemSolved", handleProblemSolved);
  }, []);

  // Update streak when user starts a problem
  useEffect(() => {
    const handleUpdateStreak = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDate = today.toISOString().split("T")[0];

      const lastDate = streakData.lastStudyDate
        ? new Date(streakData.lastStudyDate)
        : null;
      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
      }

      const daysDiff = lastDate
        ? Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysDiff === 0) {
        return; // Already studied today
      } else if (daysDiff === 1) {
        const newStreak = streakData.currentStreak + 1;
        updateStreak({
          current_streak: newStreak,
          longest_streak: Math.max(streakData.longestStreak, newStreak),
          last_study_date: todayDate,
        });
        if (onStreakChange) onStreakChange(newStreak);
      } else {
        updateStreak({
          current_streak: 1,
          longest_streak: streakData.longestStreak,
          last_study_date: todayDate,
        });
        if (onStreakChange) onStreakChange(1);
      }
    };

    const handleProblemStarted = () => {
      handleUpdateStreak();
    };

    window.addEventListener("problemStarted", handleProblemStarted);
    return () => window.removeEventListener("problemStarted", handleProblemStarted);
  }, [streakData, updateStreak, onStreakChange]);

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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSaveGoals = () => {
    const today = new Date().toISOString().split("T")[0];
    updateGoal({
      date: today,
      problems_goal: tempGoals.problems,
      time_goal: tempGoals.time,
      problems_completed: todayGoal.problems_completed || 0,
      time_completed: todayGoal.time_completed || 0,
    });
  };

  const getMotivationalMessage = () => {
    if (overallProgress >= 100) return "🎉 Goals achieved! Amazing work!";
    if (overallProgress >= 75) return "💪 Almost there! Keep going!";
    if (overallProgress >= 50) return "📈 Great progress! Halfway there!";
    if (overallProgress >= 25) return "🌱 Good start! You've got this!";
    return "🚀 Let's get started!";
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{ 
          position: 'fixed', 
          top: 'max(1rem, env(safe-area-inset-top, 1rem))', 
          left: 'max(1rem, env(safe-area-inset-left, 1rem))', 
          zIndex: 50 
        }}
        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:from-blue-600 hover:to-purple-600 active:scale-95 transition-all min-h-[44px] touch-device:min-h-[48px]"
        aria-label="Open progress hub"
        title="Progress Hub"
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
    <div
      ref={panelRef}
      style={{ 
        position: 'fixed', 
        top: 'max(1rem, env(safe-area-inset-top, 1rem))', 
        left: 'max(1rem, env(safe-area-inset-left, 1rem))', 
        zIndex: 50,
        maxWidth: 'calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))'
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col transition-all duration-200"
    >
      {/* Header with Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1">
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "stats"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Stats
          </button>
          <button
            onClick={() => setActiveTab("goals")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "goals"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => setActiveTab("timer")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "timer"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Timer
          </button>
          <button
            onClick={() => setActiveTab("streak")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "streak"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Streak
          </button>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "stats" && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-blue-600 dark:text-blue-400 text-xs font-medium mb-1">Level</p>
                <p className="text-blue-900 dark:text-blue-100 text-2xl font-bold">{stats.level}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <p className="text-purple-600 dark:text-purple-400 text-xs font-medium mb-1">XP</p>
                <p className="text-purple-900 dark:text-purple-100 text-2xl font-bold">{stats.xp.toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <p className="text-orange-600 dark:text-orange-400 text-xs font-medium mb-1">Streak</p>
                <p className="text-orange-900 dark:text-orange-100 text-2xl font-bold">{stats.streak} days</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p className="text-green-600 dark:text-green-400 text-xs font-medium mb-1">Solved</p>
                <p className="text-green-900 dark:text-green-100 text-2xl font-bold">{stats.problemsSolved}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "goals" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Daily Goals</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{getMotivationalMessage()}</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Problems</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {problemsSolvedToday} / {todayGoal.problems_goal || 5}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${problemsProgress}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Time (minutes)</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {timeSpentToday} / {todayGoal.time_goal || 30}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${timeProgress}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">Set Goals</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Problems per day</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={tempGoals.problems}
                      onChange={(e) => setTempGoals({ ...tempGoals, problems: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Time per day (minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={tempGoals.time}
                      onChange={(e) => setTempGoals({ ...tempGoals, time: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSaveGoals}
                    className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Save Goals
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timer" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Study Timer</h3>
              {isRunning && (
                <div className="text-center py-4">
                  <div className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {formatTime(elapsedTime)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Session active</p>
                </div>
              )}
              {!isRunning && (
                <div className="text-center py-4">
                  <div className="text-3xl font-mono font-bold text-gray-400 dark:text-gray-500 mb-2">00:00</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Start a problem to begin timing</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Problems this session:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{problemsSolvedThisSession}</span>
                </div>
                {sessions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total sessions:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{sessions.length}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "streak" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Study Streak</h3>
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-orange-500 dark:text-orange-400 mb-2">
                  🔥 {streakData.currentStreak}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">days in a row</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Longest streak:</span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">{streakData.longestStreak} days</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">
                Start solving problems daily to maintain your streak!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

