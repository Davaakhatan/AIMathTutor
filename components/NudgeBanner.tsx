"use client";

import { useState, useEffect } from "react";
import { useNudges, Nudge } from "@/hooks/useNudges";

interface NudgeBannerProps {
  onAction?: (nudge: Nudge) => void;
}

const nudgeIcons: Record<Nudge["type"], string> = {
  streak_at_risk: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  comeback: "M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z",
  milestone_close: "M13 10V3L4 14h7v7l9-11h-7z",
  skill_decay: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  daily_goal: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  achievement_progress: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
};

const nudgeColors: Record<Nudge["priority"], { bg: string; border: string; icon: string }> = {
  high: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-500 dark:text-red-400",
  },
  medium: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: "text-yellow-500 dark:text-yellow-400",
  },
  low: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-500 dark:text-blue-400",
  },
};

export default function NudgeBanner({ onAction }: NudgeBannerProps) {
  const { nudges, dismissNudge } = useNudges();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-rotate through nudges
  useEffect(() => {
    if (nudges.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % nudges.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [nudges.length]);

  if (nudges.length === 0 || !isVisible) return null;

  const currentNudge = nudges[currentIndex];
  if (!currentNudge) return null;

  const colors = nudgeColors[currentNudge.priority];
  const icon = nudgeIcons[currentNudge.type];

  const handleDismiss = () => {
    if (nudges.length === 1) {
      setIsVisible(false);
    } else {
      dismissNudge(currentNudge.id);
      setCurrentIndex(0);
    }
  };

  const handleAction = () => {
    if (onAction) {
      onAction(currentNudge);
    }
    handleDismiss();
  };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-3 mb-4 transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${colors.icon}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {currentNudge.title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {currentNudge.message}
          </p>

          {currentNudge.action && (
            <button
              onClick={handleAction}
              className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              {currentNudge.action.label} →
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Dots indicator for multiple nudges */}
      {nudges.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {nudges.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                idx === currentIndex ? "bg-gray-600 dark:bg-gray-300" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
