"use client";

import { Message, ParsedProblem } from "@/types";
import { useState } from "react";

interface ProblemProgressProps {
  messages: Message[];
  problem: ParsedProblem;
}

/**
 * Shows progress through solving a problem
 * Based on conversation length and hints used
 */
export default function ProblemProgress({ messages, problem }: ProblemProgressProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const userMessages = messages.filter(m => m.role === "user");
  const tutorMessages = messages.filter(m => m.role === "tutor");
  const hintsUsed = messages.filter(m => 
    m.role === "tutor" && (
      m.content.toLowerCase().includes("hint") ||
      m.content.toLowerCase().includes("clue") ||
      m.content.toLowerCase().includes("try")
    )
  ).length;

  // Calculate progress (rough estimate based on conversation length)
  // More exchanges = more progress, but also more hints = less progress
  const totalExchanges = Math.min(userMessages.length, tutorMessages.length);
  const progress = Math.min(100, Math.max(0, 
    (totalExchanges * 15) - (hintsUsed * 5)
  ));

  // Determine stage
  const getStage = () => {
    if (totalExchanges === 0) return "Starting";
    if (totalExchanges < 3) return "Understanding";
    if (totalExchanges < 6) return "Working";
    if (totalExchanges < 10) return "Solving";
    return "Finalizing";
  };

  if (messages.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Progress
          </h4>
          <span className="text-xs text-gray-500">
            {getStage()}
          </span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={showDetails ? "Hide details" : "Show details"}
        >
          <svg 
            className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
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
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gray-900 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {showDetails && (
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-500 mb-1">Exchanges</p>
              <p className="text-gray-900 font-medium">{totalExchanges}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Hints Used</p>
              <p className="text-gray-900 font-medium">{hintsUsed}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Progress</p>
              <p className="text-gray-900 font-medium">{Math.round(progress)}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 pt-2">
            Keep going! You're making progress through this problem.
          </p>
        </div>
      )}
    </div>
  );
}

