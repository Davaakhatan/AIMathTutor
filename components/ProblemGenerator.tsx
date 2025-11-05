"use client";

import { useState } from "react";
import { ParsedProblem, ProblemType } from "@/types";

interface ProblemGeneratorProps {
  onProblemGenerated: (problem: ParsedProblem) => void;
  currentType?: ProblemType;
  apiKey?: string;
}

export default function ProblemGenerator({
  onProblemGenerated,
  currentType,
  apiKey,
}: ProblemGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<ProblemType>(
    currentType || ProblemType.ALGEBRA
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<"elementary" | "middle school" | "high school" | "advanced" | "random">("random");

  const problemTemplates: Record<ProblemType, string[]> = {
    [ProblemType.ARITHMETIC]: [
      "15 + 23 = ?",
      "48 - 19 = ?",
      "7 × 8 = ?",
      "56 ÷ 7 = ?",
      "12 + 34 - 18 = ?",
    ],
    [ProblemType.ALGEBRA]: [
      "2x + 5 = 13",
      "3x - 7 = 14",
      "x + 8 = 20",
      "5x = 25",
      "2x - 3 = 11",
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
      "3x + 2 = 2x + 8",
      "5(x - 2) + 3 = 18",
      "Solve: 4x - 7 = 2x + 9",
      "2(x + 5) - 3(x - 2) = 10",
    ],
    [ProblemType.UNKNOWN]: [
      "Solve for x: 2x + 5 = 13",
      "What is 15 + 23?",
      "Find the area of a rectangle with length 8 and width 5",
    ],
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Select difficulty level (random if "random" is selected)
      let difficulty: string;
      if (selectedDifficulty === "random") {
        const difficulties = ["elementary", "middle school", "high school", "advanced"];
        difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      } else {
        difficulty = selectedDifficulty;
      }
      
      console.log("Generating problem with difficulty:", difficulty); // Debug log
      
      // Try AI generation first, fallback to templates
      try {
        const response = await fetch("/api/generate-problem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: selectedType,
            difficulty: difficulty,
            ...(apiKey && { apiKey }), // Include API key if provided
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.problem) {
            // Store the difficulty with the problem for later reference
            const problemWithDifficulty = {
              ...result.problem,
              generatedDifficulty: difficulty, // Store the difficulty used
            };
            onProblemGenerated(problemWithDifficulty);
            setIsGenerating(false);
            return;
          }
        }
      } catch (aiError) {
        console.error("AI generation failed:", aiError);
        console.log("Falling back to templates");
      }

      // Fallback to templates
      const templates = problemTemplates[selectedType];
      if (templates && templates.length > 0) {
        const randomProblem = templates[Math.floor(Math.random() * templates.length)];
        const problem: ParsedProblem = {
          text: randomProblem,
          type: selectedType,
          confidence: 1.0,
        };
        onProblemGenerated(problem);
      }
    } catch (error) {
      console.error("Error generating problem:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const types = [
    { value: ProblemType.ARITHMETIC, label: "Arithmetic", icon: "🔢" },
    { value: ProblemType.ALGEBRA, label: "Algebra", icon: "📐" },
    { value: ProblemType.GEOMETRY, label: "Geometry", icon: "📏" },
    { value: ProblemType.WORD_PROBLEM, label: "Word Problem", icon: "📝" },
    { value: ProblemType.MULTI_STEP, label: "Multi-Step", icon: "🔗" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Generate Practice Problem</h3>
      </div>
      
      {/* Difficulty Selector */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Difficulty Level</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "random" as const, label: "🎲 Random" },
            { value: "elementary" as const, label: "Elementary" },
            { value: "middle school" as const, label: "Middle School" },
            { value: "high school" as const, label: "High School" },
            { value: "advanced" as const, label: "Advanced" },
          ].map((diff) => (
            <button
              key={diff.value}
              onClick={() => setSelectedDifficulty(diff.value)}
              disabled={isGenerating}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedDifficulty === diff.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Select ${diff.label} difficulty`}
            >
              {diff.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {types.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              disabled={isGenerating}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                selectedType === type.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Select ${type.label}`}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors font-medium text-sm whitespace-nowrap flex items-center gap-2"
          aria-label="Generate problem"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Generate</span>
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Generate a random practice problem of the selected type. Problems are generated using AI for variety.
      </p>
      {isGenerating && (
        <div className="mt-3 text-xs text-gray-400 animate-pulse">
          Generating problem...
        </div>
      )}
    </div>
  );
}

