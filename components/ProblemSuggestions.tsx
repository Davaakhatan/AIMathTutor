"use client";

import { useState, useEffect, useRef } from "react";
import { ParsedProblem } from "@/types";
import { useAdaptivePractice, AdaptiveProblem } from "@/hooks/useAdaptivePractice";
import { useAuth } from "@/contexts/AuthContext";

interface ProblemSuggestionsProps {
  onSelectProblem: (problem: ParsedProblem) => void;
}

const difficultyColors: Record<string, string> = {
  elementary: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  middle: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const sessionTypeLabels: Record<string, { label: string; description: string; icon: string }> = {
  balanced: {
    label: "Balanced",
    description: "Mix of improvement and practice",
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
  },
  weakness: {
    label: "Focus Areas",
    description: "Target your weak spots",
    icon: "M13 10V3L4 14h7v7l9-11h-7z"
  },
  strength: {
    label: "Build Mastery",
    description: "Advance your strong areas",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
  },
  challenge: {
    label: "Challenge",
    description: "Push your limits",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
  },
};

/**
 * Adaptive Practice Component
 * Generates personalized problem sessions based on user performance
 */
export default function ProblemSuggestions({ onSelectProblem }: ProblemSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"balanced" | "weakness" | "strength" | "challenge">("balanced");
  const [isGeneratingProblem, setIsGeneratingProblem] = useState(false);
  const { user, activeProfile, userRole } = useAuth();
  const { session, analysis, isLoading, error, generateSession, getAnalysis } = useAdaptivePractice();
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Load session when panel opens
  useEffect(() => {
    if (isOpen && user) {
      const profileId = userRole === "student" ? null : (activeProfile?.id || null);
      generateSession(selectedType, 5, profileId);
      getAnalysis(profileId);
    }
  }, [isOpen, user, selectedType, activeProfile?.id, userRole]);

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
      // Generate a problem using the API
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
          setIsOpen(false);
        }
      } else {
        // Fallback to simple problem
        onSelectProblem({
          text: `Practice ${problem.subject} problem at ${problem.difficulty} level`,
          type: problem.subject.toUpperCase().replace(" ", "_") as any,
          confidence: 1.0,
        });
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Error generating problem:", err);
    } finally {
      setIsGeneratingProblem(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-30 bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        style={{ bottom: "29rem" }}
        aria-label="Open adaptive practice"
        title="Smart Practice"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col transition-colors"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">Smart Practice</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
          aria-label="Close"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!user ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 transition-colors">
            <p className="text-sm mb-2">Sign in for personalized practice!</p>
            <p className="text-xs">We&apos;ll analyze your performance and suggest problems tailored to you.</p>
          </div>
        ) : (
          <>
            {/* Session Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              {(["challenge", "weakness", "strength", "balanced"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleSessionTypeChange(type)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedType === type
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className={`w-4 h-4 ${selectedType === type ? "text-indigo-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sessionTypeLabels[type].icon} />
                    </svg>
                    <span className={`text-xs font-medium ${selectedType === type ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {sessionTypeLabels[type].label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Performance Analysis */}
            {analysis && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs">
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
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
