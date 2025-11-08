"use client";

import { useState } from "react";
import { ProblemType, ParsedProblem } from "@/types";

interface PracticeContentProps {
  onStartPractice: (problem: ParsedProblem) => void;
  apiKey?: string;
}

/**
 * Practice Content - Quick practice mode with random problem generation
 */
export default function PracticeContent({ onStartPractice, apiKey }: PracticeContentProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const problemTypes: ProblemType[] = [
    ProblemType.ARITHMETIC,
    ProblemType.ALGEBRA,
    ProblemType.GEOMETRY,
    ProblemType.WORD_PROBLEM,
    ProblemType.MULTI_STEP,
  ];

  const problemTemplates: Partial<Record<ProblemType, string[]>> = {
    [ProblemType.ARITHMETIC]: [
      "15 + 23 = ?",
      "48 - 19 = ?",
      "7 × 8 = ?",
      "56 ÷ 7 = ?",
      "12 + 34 - 18 = ?",
      "What is 25% of 80?",
      "Calculate: 3² + 4²",
    ],
    [ProblemType.ALGEBRA]: [
      "2x + 5 = 13",
      "3x - 7 = 14",
      "x + 8 = 20",
      "5x = 25",
      "2x - 3 = 11",
      "Solve for x: 4x + 6 = 22",
      "If 3x + 2 = 14, what is x?",
    ],
    [ProblemType.GEOMETRY]: [
      "Find the area of a rectangle with length 8 and width 5",
      "What is the perimeter of a square with side length 6?",
      "Find the area of a circle with radius 4",
      "A triangle has angles of 60°, 60°, and ?",
      "What is the volume of a cube with side length 3?",
    ],
    [ProblemType.WORD_PROBLEM]: [
      "Sarah has 15 apples. She gives away 7. How many does she have left?",
      "A store has a 20% off sale. If an item costs $50, what's the sale price?",
      "John has twice as many books as Mary. Together they have 18 books. How many does each have?",
      "A train travels 120 miles in 2 hours. What is its speed?",
      "If 3 pizzas cost $27, how much does 1 pizza cost?",
    ],
    [ProblemType.MULTI_STEP]: [
      "2(x + 3) - 5 = 11",
      "3x + 2(x - 1) = 16",
      "Solve: 2x + 3 = x + 10",
      "If 2x + 5 = 13, then what is 3x - 2?",
    ],
    [ProblemType.UNKNOWN]: [
      "Solve: 2x + 5 = 13",
      "What is 15 + 23?",
      "Find the area of a rectangle with length 8 and width 5",
    ],
  };

  const generateRandomProblem = async () => {
    setIsGenerating(true);
    
    try {
      // Pick a random type
      const randomType = problemTypes[Math.floor(Math.random() * problemTypes.length)];
      
      // Randomly select difficulty level
      const difficulties = ["elementary", "middle school", "high school", "advanced"];
      const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      
      // Try AI generation first, fallback to templates
      try {
        const response = await fetch("/api/generate-problem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: randomType,
            difficulty: randomDifficulty,
            ...(apiKey && { apiKey }), // Include API key if provided
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.problem) {
            onStartPractice(result.problem);
            setIsGenerating(false);
            return;
          }
        }
      } catch (aiError) {
        console.error("AI generation failed:", aiError);
        console.log("Falling back to templates");
      }

      // Fallback to templates
      const templates = problemTemplates[randomType];
      if (templates && templates.length > 0) {
        const randomProblem = templates[Math.floor(Math.random() * templates.length)];
        const problem: ParsedProblem = {
          text: randomProblem,
          type: randomType,
          confidence: 1.0,
        };
        onStartPractice(problem);
      }
    } catch (error) {
      console.error("Error generating problem:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-h-[700px]">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
          Practice Mode
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Generate random problems instantly
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <button
          onClick={generateRandomProblem}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>Generate Random Problem</span>
            </>
          )}
        </button>

        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Practice Types Available
          </p>
          <div className="grid grid-cols-2 gap-2">
            <span className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg text-center">Arithmetic</span>
            <span className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-lg text-center">Algebra</span>
            <span className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-lg text-center">Geometry</span>
            <span className="px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-lg text-center">Word Problems</span>
            <span className="px-3 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-medium rounded-lg text-center col-span-2">Multi-Step</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Problems are randomly selected from various difficulty levels. Perfect for quick practice sessions!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

