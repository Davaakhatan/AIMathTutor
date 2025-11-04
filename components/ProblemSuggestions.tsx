"use client";

import { useState, useEffect, useRef } from "react";
import { ParsedProblem, ProblemType } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface SavedProblem {
  id: string;
  text: string;
  type: ProblemType;
  savedAt: number;
}

interface ProblemSuggestionsProps {
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
 * Component that suggests problems based on learning history
 * Suggests problem types that need more practice
 */
export default function ProblemSuggestions({ onSelectProblem }: ProblemSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedProblems] = useLocalStorage<SavedProblem[]>("aitutor-problem-history", []);
  const [suggestions, setSuggestions] = useState<ProblemType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Calculate suggestions based on learning history
  useEffect(() => {
    if (!isOpen || savedProblems.length === 0) {
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
  }, [isOpen, savedProblems]);

  const generateProblem = async (type: ProblemType) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/generate-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          difficulty: "middle school",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.problem) {
          onSelectProblem(result.problem);
          setIsOpen(false);
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
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error generating problem:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-30 bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        style={{ bottom: "29rem" }}
        aria-label="Open problem suggestions"
        title="Problem Suggestions"
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
      className="fixed bottom-4 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Problem Suggestions</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Close suggestions"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {savedProblems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm mb-2">Start practicing to get personalized suggestions!</p>
            <p className="text-xs">We&apos;ll suggest problem types based on your practice history.</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-600 mb-3">
              <p className="font-medium text-gray-900 mb-1">Based on your practice:</p>
              <p>We suggest focusing on these problem types to build a well-rounded foundation.</p>
            </div>
            {suggestions.map((type) => (
              <button
                key={type}
                onClick={() => generateProblem(type)}
                disabled={isGenerating}
                className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {typeLabels[type] || type}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
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
          </>
        )}
      </div>
    </div>
  );
}

