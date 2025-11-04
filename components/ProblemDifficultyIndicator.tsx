"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ProblemType } from "@/types";

interface ProblemPerformance {
  problemId: string;
  type: ProblemType;
  attempts: number;
  timeSpent: number; // in seconds
  hintsUsed: number;
  completed: boolean;
  difficulty: "easy" | "medium" | "hard";
}

interface DifficultyIndicatorProps {
  problemText: string;
  problemType?: ProblemType;
}

/**
 * Shows difficulty indicator based on student's historical performance
 */
export default function ProblemDifficultyIndicator({ 
  problemText, 
  problemType 
}: DifficultyIndicatorProps) {
  const [performanceHistory] = useLocalStorage<ProblemPerformance[]>("aitutor-performance", []);
  const [estimatedDifficulty, setEstimatedDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!problemType) return;

    // Calculate average performance for this problem type
    const typePerformance = performanceHistory.filter(p => p.type === problemType);
    
    if (typePerformance.length === 0) {
      setEstimatedDifficulty("medium");
      return;
    }

    const avgAttempts = typePerformance.reduce((sum, p) => sum + p.attempts, 0) / typePerformance.length;
    const avgTime = typePerformance.reduce((sum, p) => sum + p.timeSpent, 0) / typePerformance.length;
    const avgHints = typePerformance.reduce((sum, p) => sum + p.hintsUsed, 0) / typePerformance.length;
    const completionRate = typePerformance.filter(p => p.completed).length / typePerformance.length;

    // Determine difficulty based on performance metrics
    if (avgAttempts < 2 && avgTime < 300 && avgHints < 1 && completionRate > 0.8) {
      setEstimatedDifficulty("easy");
    } else if (avgAttempts > 4 || avgTime > 900 || avgHints > 3 || completionRate < 0.5) {
      setEstimatedDifficulty("hard");
    } else {
      setEstimatedDifficulty("medium");
    }
  }, [problemType, performanceHistory]);

  const difficultyColors = {
    easy: "bg-green-100 text-green-700 border-green-300",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    hard: "bg-red-100 text-red-700 border-red-300",
  };

  const difficultyIcons = {
    easy: "✓",
    medium: "⚡",
    hard: "🔥",
  };

  if (!problemType) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${difficultyColors[estimatedDifficulty]}`}
        title="Estimated difficulty based on your performance"
      >
        <span>{difficultyIcons[estimatedDifficulty]}</span>
        <span className="capitalize">{estimatedDifficulty}</span>
      </button>

      {showDetails && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 z-50">
          <p className="text-xs text-gray-600 mb-2">
            Based on your past performance with {problemType.replace("_", " ")} problems:
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Problems solved:</span>
              <span className="font-medium">
                {performanceHistory.filter(p => p.type === problemType && p.completed).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg. attempts:</span>
              <span className="font-medium">
                {performanceHistory.filter(p => p.type === problemType).length > 0
                  ? (performanceHistory.filter(p => p.type === problemType).reduce((sum, p) => sum + p.attempts, 0) / 
                     performanceHistory.filter(p => p.type === problemType).length).toFixed(1)
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

