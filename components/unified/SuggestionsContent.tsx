"use client";

import { useState, useEffect } from "react";
import { ProblemType, ParsedProblem } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProblemHistory } from "@/hooks/useProblemHistory";
import AdaptiveProblemSuggestions from "../AdaptiveProblemSuggestions";

interface SavedProblem {
  id: string;
  text: string;
  type: ProblemType;
  savedAt: number;
}

interface SuggestionsContentProps {
  onSelectProblem: (problem: ParsedProblem) => void;
}

const typeLabels: Record<string, string> = {
  ARITHMETIC: "Arithmetic",
  ALGEBRA: "Algebra",
  GEOMETRY: "Geometry",
  WORD_PROBLEM: "Word Problems",
  MULTI_STEP: "Multi-Step",
  UNKNOWN: "Other",
};

/**
 * Suggestions Content - Problem suggestions based on learning history
 */
export default function SuggestionsContent({ onSelectProblem }: SuggestionsContentProps) {
  const { problems: savedProblems } = useProblemHistory();
  const [suggestions, setSuggestions] = useState<ProblemType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate suggestions based on learning history
  useEffect(() => {
    if (savedProblems.length === 0) {
      // If no history, suggest common starting types
      setSuggestions([ProblemType.ARITHMETIC, ProblemType.ALGEBRA]);
      return;
    }

    // Count problems by type
    const problemsByType: Record<string, number> = {};
    savedProblems.forEach((p) => {
      const type = p.type || "UNKNOWN";
      problemsByType[type] = (problemsByType[type] || 0) + 1;
    });

    // Find types with least practice
    const allTypes: ProblemType[] = [
      ProblemType.ARITHMETIC,
      ProblemType.ALGEBRA,
      ProblemType.GEOMETRY,
      ProblemType.WORD_PROBLEM,
      ProblemType.MULTI_STEP,
    ];

    // Sort by practice count (least practiced first)
    const sorted = allTypes.sort((a, b) => {
      const countA = problemsByType[a] || 0;
      const countB = problemsByType[b] || 0;
      return countA - countB;
    });

    // Suggest top 2-3 least practiced types
    setSuggestions(sorted.slice(0, 3));
  }, [savedProblems]);

  const generateProblem = async (type: ProblemType) => {
    setIsGenerating(true);
    
    try {
      // Randomly select difficulty level
      const difficulties = ["elementary", "middle school", "high school", "advanced"];
      const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      
      const response = await fetch("/api/generate-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          difficulty: randomDifficulty,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.problem) {
          onSelectProblem(result.problem);
        }
      } else {
        // Fallback to templates
        const templates: Record<ProblemType, string[]> = {
          [ProblemType.ARITHMETIC]: [
            "15 + 23 = ?",
            "48 - 19 = ?",
            "7 × 8 = ?",
          ],
          [ProblemType.ALGEBRA]: [
            "2x + 5 = 13",
            "3x - 7 = 14",
            "x + 8 = 20",
          ],
          [ProblemType.GEOMETRY]: [
            "Find the area of a rectangle with length 8 and width 5",
            "What is the perimeter of a square with side length 6?",
            "Find the area of a circle with radius 4",
          ],
          [ProblemType.WORD_PROBLEM]: [
            "Sarah has 15 apples. She gives away 7. How many does she have left?",
            "A store has a 20% off sale. If an item costs $50, what's the sale price?",
            "If 3 pizzas cost $27, how much does 1 pizza cost?",
          ],
          [ProblemType.MULTI_STEP]: [
            "2(x + 3) - 5 = 11",
            "3x + 2 = 2x + 8",
            "5(x - 2) + 3 = 18",
          ],
          [ProblemType.UNKNOWN]: [
            "Solve for x: 2x + 5 = 13",
          ],
        };

        const typeTemplates = templates[type] || templates[ProblemType.ALGEBRA];
        const randomProblem = typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
        onSelectProblem({
          text: randomProblem,
          type,
          confidence: 1.0,
        });
      }
    } catch (error) {
      console.error("Error generating problem:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdaptiveProblemSelect = (problemText: string, conceptId: string) => {
    // Try to infer problem type from concept
    const conceptToType: Record<string, ProblemType> = {
      linear_equations: ProblemType.ALGEBRA,
      quadratic_equations: ProblemType.ALGEBRA,
      factoring: ProblemType.ALGEBRA,
      pythagorean_theorem: ProblemType.GEOMETRY,
      area_circle: ProblemType.GEOMETRY,
      area_triangle: ProblemType.GEOMETRY,
      area_rectangle: ProblemType.GEOMETRY,
      perimeter: ProblemType.GEOMETRY,
      angles: ProblemType.GEOMETRY,
      fractions: ProblemType.ARITHMETIC,
      decimals: ProblemType.ARITHMETIC,
      percentages: ProblemType.ARITHMETIC,
      ratios: ProblemType.ARITHMETIC,
    };
    
    const problem: ParsedProblem = {
      text: problemText,
      type: conceptToType[conceptId] || ProblemType.UNKNOWN,
      confidence: 0.9,
    };
    
    onSelectProblem(problem);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Adaptive Problem Suggestions based on concept mastery */}
      <AdaptiveProblemSuggestions
        onSelectProblem={handleAdaptiveProblemSelect}
        compact={false}
      />
      
      {/* Problem Type Suggestions */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-1 transition-colors">
            Or try different problem types:
          </p>
          <p>Explore different categories to build a well-rounded foundation.</p>
        </div>
        
        {savedProblems.length === 0 ? (
          <div className="text-center py-4 text-gray-400 dark:text-gray-500 transition-colors">
            <p className="text-xs">Start practicing to see personalized type suggestions!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((type) => (
              <button
                key={type}
                onClick={() => generateProblem(type)}
                disabled={isGenerating}
                className="w-full p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
                      {typeLabels[type] || type}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 transition-colors">
                      {savedProblems.filter((p) => p.type === type).length === 0
                        ? "Not practiced yet"
                        : `${savedProblems.filter((p) => p.type === type).length} problem${savedProblems.filter((p) => p.type === type).length === 1 ? "" : "s"} solved`}
                    </p>
                  </div>
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

