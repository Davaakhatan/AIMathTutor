"use client";

import { useState } from "react";
import { ProblemType, ParsedProblem } from "@/types";

interface PracticeModeProps {
  onStartPractice: (problem: ParsedProblem) => void;
}

/**
 * Quick practice mode - generates a random problem instantly
 * Different from ProblemGenerator which lets you choose the type
 */
export default function PracticeMode({ onStartPractice }: PracticeModeProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const problemTypes: ProblemType[] = [
    ProblemType.ARITHMETIC,
    ProblemType.ALGEBRA,
    ProblemType.GEOMETRY,
    ProblemType.WORD_PROBLEM,
    ProblemType.MULTI_STEP,
  ];

  const problemTemplates: Record<ProblemType, string[]> = {
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
  };

  const generateRandomProblem = async () => {
    setIsGenerating(true);
    
    try {
      // Pick a random type
      const randomType = problemTypes[Math.floor(Math.random() * problemTypes.length)];
      
      // Try AI generation first, fallback to templates
      try {
        const response = await fetch("/api/generate-problem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: randomType,
            difficulty: "middle school",
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
        // Fallback to templates
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
    <button
      onClick={generateRandomProblem}
      disabled={isGenerating}
      className="fixed bottom-52 right-4 z-40 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      aria-label="Generate random practice problem"
      title="Quick Practice - Random Problem"
    >
      {isGenerating ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      )}
    </button>
  );
}

