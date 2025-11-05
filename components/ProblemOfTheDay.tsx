"use client";

import { useState, useEffect } from "react";
import { ParsedProblem, ProblemType } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface ProblemOfTheDayProps {
  onProblemSelected: (problem: ParsedProblem) => void;
  apiKey?: string;
}

interface DailyProblem {
  problem: ParsedProblem;
  date: string; // YYYY-MM-DD format
  difficulty: "elementary" | "middle school" | "high school" | "advanced";
  topic: string;
}

/**
 * Problem of the Day - A new challenge every day
 * Generates a problem based on the current date (deterministic seed)
 */
export default function ProblemOfTheDay({ 
  onProblemSelected,
  apiKey 
}: ProblemOfTheDayProps) {
  const [dailyProblem, setDailyProblem] = useLocalStorage<DailyProblem | null>("aitutor-daily-problem", null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCard, setShowCard] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Only render after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if we need a new problem (different day)
  useEffect(() => {
    if (!isMounted) return;
    
    const today = getTodayDate();
    
    // If no stored problem or it's from a different day, generate new one
    if (!dailyProblem || dailyProblem.date !== today) {
      generateDailyProblem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]); // Only run after mount - dailyProblem check is intentional

  // Reset card visibility when problem changes (new day)
  useEffect(() => {
    if (dailyProblem) {
      const today = getTodayDate();
      if (dailyProblem.date === today && !showCard) {
        // Show card again if it's today's problem and was hidden
        setShowCard(true);
      }
    }
  }, [dailyProblem?.date, dailyProblem, showCard]);

  const generateDailyProblem = async () => {
    setIsGenerating(true);
    const today = getTodayDate();
    
    try {
      // Use date as seed to generate consistent problems per day
      // Rotate through difficulty levels based on day of week
      const dayOfWeek = new Date().getDay();
      const difficulties: Array<"elementary" | "middle school" | "high school" | "advanced"> = [
        "elementary",
        "middle school", 
        "high school",
        "advanced",
        "middle school",
        "high school",
        "elementary"
      ];
      const selectedDifficulty = difficulties[dayOfWeek];

      // Rotate through problem types based on day of month
      const dayOfMonth = new Date().getDate();
      const problemTypes: ProblemType[] = [
        ProblemType.ARITHMETIC,
        ProblemType.ALGEBRA,
        ProblemType.GEOMETRY,
        ProblemType.WORD_PROBLEM,
        ProblemType.MULTI_STEP,
      ];
      const selectedType = problemTypes[dayOfMonth % problemTypes.length];

      // Generate problem via API
      const response = await fetch("/api/generate-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          difficulty: selectedDifficulty,
          ...(apiKey && { apiKey }),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.problem) {
          const newDailyProblem: DailyProblem = {
            problem: result.problem,
            date: today,
            difficulty: selectedDifficulty,
            topic: selectedType.replace("_", " "),
          };
          setDailyProblem(newDailyProblem);
        } else {
          // Fallback to template
          generateFallbackProblem(selectedType, selectedDifficulty);
        }
      } else {
        // Fallback to template
        generateFallbackProblem(selectedType, selectedDifficulty);
      }
    } catch (error) {
      console.error("Error generating daily problem:", error);
      // Fallback to template
      const dayOfWeek = new Date().getDay();
      const difficulties: Array<"elementary" | "middle school" | "high school" | "advanced"> = [
        "elementary",
        "middle school", 
        "high school",
        "advanced",
        "middle school",
        "high school",
        "elementary"
      ];
      const dayOfMonth = new Date().getDate();
      const problemTypes: ProblemType[] = [
        ProblemType.ARITHMETIC,
        ProblemType.ALGEBRA,
        ProblemType.GEOMETRY,
        ProblemType.WORD_PROBLEM,
        ProblemType.MULTI_STEP,
      ];
      generateFallbackProblem(
        problemTypes[dayOfMonth % problemTypes.length],
        difficulties[dayOfWeek]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackProblem = (
    type: ProblemType,
    difficulty: "elementary" | "middle school" | "high school" | "advanced"
  ) => {
    const templates: Record<ProblemType, string[]> = {
      [ProblemType.ARITHMETIC]: [
        "If a pizza is cut into 8 equal slices and you eat 3 slices, what fraction of the pizza did you eat?",
        "Calculate: 15 × 4 + 12 ÷ 3",
        "What is 25% of 80?",
        "Solve: 3² + 4² = ?",
        "A box contains 24 apples. If you remove 9 apples, how many are left?",
      ],
      [ProblemType.ALGEBRA]: [
        "Solve for x: 2x + 5 = 13",
        "If 3x - 7 = 14, what is the value of x?",
        "Find x if: x + 8 = 20",
        "Solve: 5x = 25",
        "If 2x - 3 = 11, what is x?",
      ],
      [ProblemType.GEOMETRY]: [
        "Find the area of a rectangle with length 8 and width 5",
        "What is the perimeter of a square with side length 6?",
        "Find the area of a circle with radius 4. Use π ≈ 3.14",
        "A triangle has angles of 60°, 60°, and ? What is the missing angle?",
        "What is the volume of a cube with side length 3?",
      ],
      [ProblemType.WORD_PROBLEM]: [
        "Sarah has 15 apples. She gives away 7. How many does she have left?",
        "A store has a 20% off sale. If an item costs $50, what's the sale price?",
        "John has twice as many books as Mary. Together they have 18 books. How many does each have?",
        "A train travels 120 miles in 2 hours. What is its speed in miles per hour?",
        "If 3 pizzas cost $27, how much does 1 pizza cost?",
      ],
      [ProblemType.MULTI_STEP]: [
        "Solve: 2(x + 3) - 5 = 11",
        "If 3x + 2 = 2x + 8, what is x?",
        "Solve: 5(x - 2) + 3 = 18",
        "Find x: 4x - 7 = 2x + 9",
        "Solve: 2(x + 5) - 3(x - 2) = 10",
      ],
      [ProblemType.UNKNOWN]: [
        "Solve for x: 2x + 5 = 13",
        "What is 15 + 23?",
        "Find the area of a rectangle with length 8 and width 5",
      ],
    };

    const typeTemplates = templates[type] || templates[ProblemType.ALGEBRA];
    const randomIndex = new Date().getDate() % typeTemplates.length;
    const problemText = typeTemplates[randomIndex];

    const newDailyProblem: DailyProblem = {
      problem: {
        text: problemText,
        type: type,
        confidence: 1.0,
      },
      date: getTodayDate(),
      difficulty: difficulty,
      topic: type.replace("_", " "),
    };
    setDailyProblem(newDailyProblem);
  };

  const handleStartProblem = () => {
    if (dailyProblem && !isGenerating) {
      onProblemSelected(dailyProblem.problem);
      setShowCard(false);
    }
  };

  // Don't render until after hydration to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  if (!showCard || !dailyProblem) {
    return null;
  }

  const difficultyColors = {
    elementary: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    "middle school": "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    "high school": "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    advanced: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
  };

  const difficultyIcons = {
    elementary: "🌱",
    "middle school": "📚",
    "high school": "🎓",
    advanced: "🔥",
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg transition-colors">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-bold">📅</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors">
                Problem of the Day
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors line-clamp-1">
                {new Date().toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${difficultyColors[dailyProblem.difficulty]}`}>
              {difficultyIcons[dailyProblem.difficulty]} {dailyProblem.difficulty.charAt(0).toUpperCase() + dailyProblem.difficulty.slice(1)}
            </span>
            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700 text-xs font-medium transition-colors">
              {dailyProblem.topic}
            </span>
          </div>

          <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 font-medium mb-3 transition-colors break-words">
            {dailyProblem.problem.text}
          </p>
        </div>

        <button
          onClick={() => setShowCard(false)}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          aria-label="Close Problem of the Day"
          title="Close"
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

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                Generating today&apos;s challenge...
              </span>
            ) : (
              "A new challenge every day!"
            )}
        </p>
        <button
          onClick={handleStartProblem}
          disabled={isGenerating}
          className="px-4 py-2.5 sm:py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 min-h-[44px] touch-device:min-h-[48px]"
          aria-label="Start Problem of the Day"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span>Start Challenge</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

