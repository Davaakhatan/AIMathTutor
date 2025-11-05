"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface DailyGoal {
  problems: number;
  time: number; // in minutes
  date: string; // YYYY-MM-DD
}

interface DailyGoalsProps {
  problemsSolvedToday: number;
  timeSpentToday: number; // in minutes
}

/**
 * Daily Goals Tracker
 * Set and track daily learning goals
 */
export default function DailyGoals({ problemsSolvedToday, timeSpentToday }: DailyGoalsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [goals, setGoals] = useLocalStorage<DailyGoal>("aitutor-daily-goals", {
    problems: 5,
    time: 30,
    date: new Date().toISOString().split("T")[0],
  });
  const [tempGoals, setTempGoals] = useState({ problems: goals.problems, time: goals.time });

  // Reset goals if it's a new day
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (goals.date !== today) {
      setGoals({
        problems: 5,
        time: 30,
        date: today,
      });
      setTempGoals({ problems: 5, time: 30 });
    }
  }, [goals.date, setGoals]);

  const problemsProgress = Math.min(100, (problemsSolvedToday / goals.problems) * 100);
  const timeProgress = Math.min(100, (timeSpentToday / goals.time) * 100);
  const overallProgress = (problemsProgress + timeProgress) / 2;

  const handleSaveGoals = () => {
    setGoals({
      ...goals,
      problems: tempGoals.problems,
      time: tempGoals.time,
    });
    setIsOpen(false);
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
        className="fixed bottom-4 left-28 z-40 hidden sm:block bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 text-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:from-blue-600 hover:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700 active:scale-95 transition-all min-h-[44px] touch-device:min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Daily goals"
        title="Daily Goals"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium">
          {Math.round(overallProgress)}%
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-32 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 max-w-[calc(100vw-2rem)] transition-colors">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">Daily Goals</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Overall Progress */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 transition-colors">{getMotivationalMessage()}</p>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">
            {Math.round(overallProgress)}% Complete
          </p>
        </div>

        {/* Problems Goal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors">
              Problems Solved
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
              {problemsSolvedToday} / {goals.problems}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
            <div
              className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-500"
              style={{ width: `${problemsProgress}%` }}
            />
          </div>
        </div>

        {/* Time Goal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors">
              Study Time
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
              {timeSpentToday} / {goals.time} min
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
            <div
              className="h-full bg-purple-500 dark:bg-purple-600 transition-all duration-500"
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        </div>

        {/* Goal Settings */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block transition-colors">
              Target Problems per Day
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={tempGoals.problems}
              onChange={(e) => setTempGoals({ ...tempGoals, problems: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block transition-colors">
              Target Time per Day (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={tempGoals.time}
              onChange={(e) => setTempGoals({ ...tempGoals, time: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
            />
          </div>
          <button
            onClick={handleSaveGoals}
            className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 transition-all text-sm font-medium"
          >
            Save Goals
          </button>
        </div>
      </div>
    </div>
  );
}

