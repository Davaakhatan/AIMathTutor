"use client";

import { useState, useEffect, memo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  getConceptsNeedingPractice,
  getAllConcepts,
  ConceptTrackingData,
  MathConcept,
} from "@/services/conceptTracker";

interface AdaptiveProblemSuggestionsProps {
  onSelectProblem?: (problemText: string, conceptId: string) => void;
  compact?: boolean;
}

interface ProblemSuggestion {
  conceptId: string;
  conceptName: string;
  masteryLevel: number;
  suggestedProblem: string;
  difficulty: "elementary" | "middle" | "high" | "advanced";
  reason: string;
}

const AdaptiveProblemSuggestions = memo(function AdaptiveProblemSuggestions({
  onSelectProblem,
  compact = false,
}: AdaptiveProblemSuggestionsProps) {
  const [conceptData] = useLocalStorage<ConceptTrackingData>("aitutor-concepts", {
    concepts: {},
    lastUpdated: Date.now(),
  });
  const [suggestions, setSuggestions] = useState<ProblemSuggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [conceptData]);

  const generateSuggestions = async () => {
    setIsLoading(true);

    // Get concepts needing practice (mastery < 70%)
    const weakConcepts = getConceptsNeedingPractice(conceptData, 70);
    
    // If no weak concepts, get concepts with lowest mastery (top 3)
    const allConcepts = getAllConcepts(conceptData);
    const conceptsToPractice =
      weakConcepts.length > 0
        ? weakConcepts.slice(0, 3)
        : allConcepts.slice(0, 3);

    if (conceptsToPractice.length === 0) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Generate problem suggestions for each concept
    const newSuggestions: ProblemSuggestion[] = conceptsToPractice.map((concept) => {
      const { problem, difficulty, reason } = generateProblemForConcept(concept);
      return {
        conceptId: concept.id,
        conceptName: concept.name,
        masteryLevel: concept.masteryLevel,
        suggestedProblem: problem,
        difficulty,
        reason,
      };
    });

    setSuggestions(newSuggestions);
    setIsLoading(false);
  };

  const generateProblemForConcept = (
    concept: MathConcept
  ): { problem: string; difficulty: "elementary" | "middle" | "high" | "advanced"; reason: string } => {
    const mastery = concept.masteryLevel;
    
    // Determine difficulty based on mastery level
    let difficulty: "elementary" | "middle" | "high" | "advanced" = "middle";
    if (mastery < 30) {
      difficulty = "elementary";
    } else if (mastery < 50) {
      difficulty = "middle";
    } else if (mastery < 70) {
      difficulty = "high";
    } else {
      difficulty = "advanced";
    }

    // Generate problem based on concept type
    const problems = PROBLEM_TEMPLATES[concept.id] || PROBLEM_TEMPLATES.default;
    const template = problems[difficulty] || problems.middle || problems.elementary || PROBLEM_TEMPLATES.default.middle;
    const problem: string = typeof template === "function" ? template() : (template || "Solve for x: 2x + 5 = 13");

    const reason =
      mastery < 30
        ? "You're just starting with this concept - let's practice the basics!"
        : mastery < 50
        ? "You're making progress - a bit more practice will help!"
        : mastery < 70
        ? "You're getting there - let's reinforce your understanding!"
        : "You've got this! Let's challenge yourself with a harder problem.";

    return { problem, difficulty, reason };
  };

  const handleSelectProblem = (suggestion: ProblemSuggestion) => {
    if (onSelectProblem) {
      onSelectProblem(suggestion.suggestedProblem, suggestion.conceptId);
    } else {
      // Fallback: dispatch custom event
      window.dispatchEvent(
        new CustomEvent("problemSuggested", {
          detail: {
            problem: suggestion.suggestedProblem,
            conceptId: suggestion.conceptId,
          },
        })
      );
    }
  };

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 mb-4 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 transition-colors">
            🎯 Practice Suggestions
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
            Based on your progress
          </span>
        </div>
        {!compact && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Generating suggestions...</p>
        </div>
      ) : (
        isExpanded && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">
              These problems target concepts you&apos;re working on mastering:
            </p>
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.conceptId}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 transition-colors">
                        {suggestion.conceptName}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          suggestion.masteryLevel >= 70
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : suggestion.masteryLevel >= 50
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        }`}
                      >
                        {suggestion.masteryLevel}% mastery
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 transition-colors">
                      {suggestion.reason}
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 mb-2">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-mono transition-colors">
                        {suggestion.suggestedProblem}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectProblem(suggestion)}
                  className="w-full text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Try This Problem
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
});

// Problem templates for different concepts and difficulty levels
const PROBLEM_TEMPLATES: Record<
  string,
  Partial<Record<"elementary" | "middle" | "high" | "advanced", string | (() => string)>>
> = {
  linear_equations: {
    elementary: () => {
      const a = Math.floor(Math.random() * 5) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const c = a * 2 + b;
      return `Solve for x: ${a}x + ${b} = ${c}`;
    },
    middle: () => {
      const a = Math.floor(Math.random() * 5) + 2;
      const b = Math.floor(Math.random() * 10) + 5;
      const c = a * 3 + b;
      return `Solve for x: ${a}x + ${b} = ${c}`;
    },
    high: () => {
      const a = Math.floor(Math.random() * 5) + 3;
      const b = Math.floor(Math.random() * 10) + 10;
      const c = Math.floor(Math.random() * 10) + 5;
      return `Solve for x: ${a}x + ${b} = ${a}x + ${c}`;
    },
  },
  quadratic_equations: {
    middle: () => {
      const a = 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const c = Math.floor(Math.random() * 5) + 1;
      return `Solve: x² + ${b}x + ${c} = 0`;
    },
    high: () => {
      const a = Math.floor(Math.random() * 3) + 2;
      const b = Math.floor(Math.random() * 10) + 5;
      const c = Math.floor(Math.random() * 10) + 1;
      return `Solve: ${a}x² + ${b}x + ${c} = 0`;
    },
  },
  factoring: {
    middle: () => {
      const factor1 = Math.floor(Math.random() * 5) + 2;
      const factor2 = Math.floor(Math.random() * 5) + 2;
      return `Factor: ${factor1 * factor2}x + ${factor1 * factor2}`;
    },
    high: () => {
      const a = Math.floor(Math.random() * 5) + 2;
      const b = Math.floor(Math.random() * 5) + 2;
      return `Factor: ${a * b}x² + ${a + b}x + 1`;
    },
  },
  pythagorean_theorem: {
    middle: () => {
      const a = Math.floor(Math.random() * 5) + 3;
      const b = Math.floor(Math.random() * 5) + 3;
      return `In a right triangle, if one leg is ${a} and the other is ${b}, what is the length of the hypotenuse?`;
    },
    high: () => {
      const a = Math.floor(Math.random() * 10) + 5;
      const c = Math.floor(Math.random() * 10) + 10;
      return `In a right triangle, if one leg is ${a} and the hypotenuse is ${c}, what is the length of the other leg?`;
    },
  },
  area_circle: {
    elementary: () => {
      const r = Math.floor(Math.random() * 5) + 1;
      return `What is the area of a circle with radius ${r}?`;
    },
    middle: () => {
      const r = Math.floor(Math.random() * 10) + 5;
      return `Find the area of a circle with radius ${r} (use π ≈ 3.14)`;
    },
  },
  area_triangle: {
    elementary: () => {
      const base = Math.floor(Math.random() * 10) + 5;
      const height = Math.floor(Math.random() * 10) + 5;
      return `What is the area of a triangle with base ${base} and height ${height}?`;
    },
    middle: () => {
      const base = Math.floor(Math.random() * 10) + 10;
      const height = Math.floor(Math.random() * 10) + 10;
      return `Calculate the area of a triangle with base ${base} and height ${height}`;
    },
  },
  fractions: {
    elementary: () => {
      const num1 = Math.floor(Math.random() * 5) + 1;
      const den1 = num1 + Math.floor(Math.random() * 3) + 1;
      const num2 = Math.floor(Math.random() * 5) + 1;
      const den2 = num2 + Math.floor(Math.random() * 3) + 1;
      return `Add: ${num1}/${den1} + ${num2}/${den2}`;
    },
    middle: () => {
      const num1 = Math.floor(Math.random() * 5) + 2;
      const den1 = num1 + Math.floor(Math.random() * 5) + 2;
      const num2 = Math.floor(Math.random() * 5) + 2;
      const den2 = num2 + Math.floor(Math.random() * 5) + 2;
      return `Simplify: ${num1}/${den1} + ${num2}/${den2}`;
    },
  },
  percentages: {
    elementary: () => {
      const num = Math.floor(Math.random() * 50) + 10;
      const percent = Math.floor(Math.random() * 20) + 10;
      return `What is ${percent}% of ${num}?`;
    },
    middle: () => {
      const num = Math.floor(Math.random() * 100) + 50;
      const percent = Math.floor(Math.random() * 30) + 15;
      return `Calculate ${percent}% of ${num}`;
    },
  },
  default: {
    elementary: () => {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      return `Solve: ${a} + x = ${a + b}`;
    },
    middle: () => {
      const a = Math.floor(Math.random() * 10) + 5;
      const b = Math.floor(Math.random() * 10) + 5;
      return `Solve: ${a}x + ${b} = ${a * 2 + b}`;
    },
    high: () => {
      const a = Math.floor(Math.random() * 10) + 10;
      const b = Math.floor(Math.random() * 10) + 10;
      return `Solve: ${a}x - ${b} = ${a - b}`;
    },
  },
};

export default AdaptiveProblemSuggestions;

