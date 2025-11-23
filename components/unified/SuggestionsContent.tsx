"use client";

import { useState, useEffect } from "react";
import { ProblemType, ParsedProblem } from "@/types";
import { useAdaptivePractice, AdaptiveProblem } from "@/hooks/useAdaptivePractice";
import { useAuth } from "@/contexts/AuthContext";

interface SuggestionsContentProps {
  onSelectProblem: (problem: ParsedProblem) => void;
}

const difficultyColors: Record<string, string> = {
  elementary: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  middle: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const sessionTypeConfig = {
  balanced: {
    label: "Balanced",
    description: "Mix of practice",
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    color: "indigo"
  },
  weakness: {
    label: "Focus",
    description: "Weak areas",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "orange"
  },
  strength: {
    label: "Mastery",
    description: "Strong areas",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    color: "green"
  },
  challenge: {
    label: "Challenge",
    description: "Push limits",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    color: "red"
  },
};

/**
 * Suggestions Content - Adaptive practice based on performance analysis
 */
export default function SuggestionsContent({ onSelectProblem }: SuggestionsContentProps) {
  const { user, activeProfile, userRole } = useAuth();
  const { session, analysis, isLoading, error, generateSession, getAnalysis } = useAdaptivePractice();
  const [selectedType, setSelectedType] = useState<"balanced" | "weakness" | "strength" | "challenge">("balanced");
  const [isGeneratingProblem, setIsGeneratingProblem] = useState(false);

  // Load session on mount
  useEffect(() => {
    if (user) {
      const profileId = userRole === "student" ? null : (activeProfile?.id || null);
      generateSession(selectedType, 5, profileId);
      getAnalysis(profileId);
    }
  }, [user, activeProfile?.id, userRole]);

  const handleSessionTypeChange = (type: "balanced" | "weakness" | "strength" | "challenge") => {
    setSelectedType(type);
    if (user) {
      const profileId = userRole === "student" ? null : (activeProfile?.id || null);
      generateSession(type, 5, profileId);
    }
  };

  const handleProblemSelect = async (problem: AdaptiveProblem) => {
    setIsGeneratingProblem(true);

    try {
      const response = await fetch("/api/generate-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: problem.subject,
          difficulty: problem.difficulty === "elementary" ? "elementary"
            : problem.difficulty === "middle" ? "middle school"
            : problem.difficulty === "high" ? "high school"
            : "advanced",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.problem) {
          onSelectProblem(result.problem);
        }
      } else {
        onSelectProblem({
          text: `Practice ${problem.subject} problem at ${problem.difficulty} level`,
          type: problem.subject.toUpperCase().replace(" ", "_") as ProblemType,
          confidence: 1.0,
        });
      }
    } catch (err) {
      console.error("Error generating problem:", err);
    } finally {
      setIsGeneratingProblem(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-h-[700px]">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
          Smart Practice
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Personalized problems based on your performance
        </p>
      </div>

      {!user ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <p className="text-sm mb-2">Sign in for personalized practice!</p>
          <p className="text-xs">We&apos;ll analyze your performance and suggest problems tailored to you.</p>
        </div>
      ) : (
        <>
          {/* Session Type Selector */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(Object.keys(sessionTypeConfig) as Array<keyof typeof sessionTypeConfig>).map((type) => (
              <button
                key={type}
                onClick={() => handleSessionTypeChange(type)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  selectedType === type
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <svg
                  className={`w-4 h-4 mx-auto mb-1 ${selectedType === type ? "text-indigo-600" : "text-gray-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sessionTypeConfig[type].icon} />
                </svg>
                <span className={`text-xs font-medium block ${selectedType === type ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400"}`}>
                  {sessionTypeConfig[type].label}
                </span>
              </button>
            ))}
          </div>

          {/* Performance Analysis */}
          {analysis && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4 text-xs">
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Your Focus</p>
              <p className="text-gray-600 dark:text-gray-400">{analysis.suggestedFocus}</p>
              {analysis.weakAreas.length > 0 && (
                <div className="mt-2">
                  <span className="text-gray-500">Needs work: </span>
                  <span className="text-orange-600 dark:text-orange-400">
                    {analysis.weakAreas.map(a => a.subject).join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-4 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Generated Problems */}
          {session && !isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>{session.problems.length} problems</span>
                <span>~{session.estimatedDuration} min | {session.totalEstimatedXP} XP</span>
              </div>

              {session.problems.map((problem, index) => (
                <button
                  key={index}
                  onClick={() => handleProblemSelect(problem)}
                  disabled={isGeneratingProblem}
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {problem.subject}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColors[problem.difficulty]}`}>
                          {problem.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {problem.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        +{problem.estimatedXP} XP
                      </span>
                      {isGeneratingProblem ? (
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
