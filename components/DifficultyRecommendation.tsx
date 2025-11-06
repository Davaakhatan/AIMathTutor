"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  DifficultyTrackingData,
  DifficultyLevel,
  getDefaultTrackingData,
  getDifficultyStats,
  getDifficultyRecommendationMessage,
  calculateRecommendedDifficulty,
} from "@/services/difficultyTracker";

interface DifficultyRecommendationProps {
  currentDifficulty?: DifficultyLevel;
  onDifficultyChange?: (difficulty: DifficultyLevel) => void;
}

/**
 * Component that shows difficulty recommendation based on performance
 */
export default function DifficultyRecommendation({
  currentDifficulty,
  onDifficultyChange,
}: DifficultyRecommendationProps) {
  const [trackingData, setTrackingData] = useLocalStorage<DifficultyTrackingData>(
    "aitutor-difficulty-tracking",
    getDefaultTrackingData()
  );

  // Use recommended difficulty as current if not provided
  const effectiveCurrent = currentDifficulty || trackingData.recommendedDifficulty || "middle";

  const stats = useMemo(() => getDifficultyStats(trackingData), [trackingData]);
  const recommended = useMemo(
    () => calculateRecommendedDifficulty(trackingData),
    [trackingData]
  );
  const currentPerf = trackingData.performances[effectiveCurrent];
  const recommendationMessage = useMemo(
    () => getDifficultyRecommendationMessage(effectiveCurrent, recommended, currentPerf),
    [effectiveCurrent, recommended, currentPerf]
  );

  const difficultyColors: Record<DifficultyLevel, string> = {
    elementary: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    middle: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    high: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    advanced: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
  };

  const difficultyIcons: Record<DifficultyLevel, string> = {
    elementary: "🌱",
    middle: "📚",
    high: "🎓",
    advanced: "🔥",
  };

  const difficultyLabels: Record<DifficultyLevel, string> = {
    elementary: "Elementary",
    middle: "Middle School",
    high: "High School",
    advanced: "Advanced",
  };

  if (stats.totalAttempts < 3) {
    return null; // Not enough data yet
  }

  const showRecommendation = recommended !== effectiveCurrent && trackingData.autoAdjustEnabled;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Difficulty Recommendation
        </h3>
        <button
          onClick={() => {
            setTrackingData({
              ...trackingData,
              autoAdjustEnabled: !trackingData.autoAdjustEnabled,
            });
          }}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            trackingData.autoAdjustEnabled
              ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}
          title={trackingData.autoAdjustEnabled ? "Auto-adjust enabled" : "Auto-adjust disabled"}
        >
          {trackingData.autoAdjustEnabled ? "Auto" : "Manual"}
        </button>
      </div>

      {/* Current Performance */}
      {currentPerf.problemsAttempted > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Current Level:</span>
            <span className={`px-2 py-1 rounded-md border text-xs font-medium ${difficultyColors[effectiveCurrent]}`}>
              {difficultyIcons[effectiveCurrent]} {difficultyLabels[effectiveCurrent]}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Success Rate</span>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {currentPerf.successRate.toFixed(0)}%
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Mastery</span>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {currentPerf.masteryScore}/100
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Attempts</span>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {currentPerf.problemsAttempted}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendation */}
      {showRecommendation && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                Recommended: {difficultyIcons[recommended]} {difficultyLabels[recommended]}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                {recommendationMessage}
              </p>
              {onDifficultyChange && (
                <button
                  onClick={() => onDifficultyChange(recommended)}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Switch to {difficultyLabels[recommended]}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overall Stats */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Total Attempts</span>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalAttempts}</div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Overall Success</span>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {stats.overallSuccessRate}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

