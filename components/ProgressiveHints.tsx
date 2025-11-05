"use client";

import { useState } from "react";
import { ParsedProblem } from "@/types";

interface ProgressiveHintsProps {
  problem: ParsedProblem;
  sessionMessages: any[];
  onHintRequest: (hint: string) => void;
  apiKey?: string; // Optional: Client-provided API key
}

/**
 * Progressive hint system that provides increasingly detailed hints
 */
export default function ProgressiveHints({ 
  problem, 
  sessionMessages, 
  onHintRequest,
  apiKey
}: ProgressiveHintsProps) {
  const [hintLevel, setHintLevel] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Generate hints based on problem type and conversation progress
  const generateHint = async () => {
    const newLevel = hintLevel + 1;
    setHintLevel(newLevel);
    setHintsUsed(hintsUsed + 1);

    try {
      const response = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problem,
          hintLevel: newLevel,
          conversationHistory: sessionMessages.slice(-4), // Last 2 exchanges
          problemType: problem.type,
          ...(apiKey && { apiKey }), // Include API key if provided
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate hint: ${response.status}`);
      }

      const data = await response.json();
      if (data.hint) {
        onHintRequest(data.hint);
      } else {
        throw new Error("No hint received from server");
      }
    } catch (error) {
      console.error("Error generating hint:", error);
      // NO FALLBACK - Show error to user instead of hardcoded hints
      const errorMessage = error instanceof Error ? error.message : "Failed to generate hint";
      onHintRequest(`⚠️ Error: ${errorMessage}. Please check your API key and try again.`);
    }
  };

  if (hintLevel >= 4) {
    return (
      <div className="text-xs text-gray-500 text-center py-2">
        <p>You&apos;ve used all available hints. Try working through the problem step by step!</p>
      </div>
    );
  }

  return (
    <button
      onClick={generateHint}
      className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium flex items-center gap-1"
      title="Get a hint (progressive - gets more detailed)"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      <span>Get Hint {hintLevel > 0 ? `(${hintLevel}/4)` : ""}</span>
    </button>
  );
}

