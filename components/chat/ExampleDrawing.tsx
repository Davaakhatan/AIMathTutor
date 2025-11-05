"use client";

import { useState } from "react";
import ExampleDrawingRenderer, { parseDrawingInstructions } from "../ai/ExampleDrawingRenderer";

interface ExampleDrawingProps {
  message: string;
  problemText?: string;
}

/**
 * Component that displays AI-generated example drawings in chat messages
 * Parses drawing instructions from AI responses and renders them
 */
export default function ExampleDrawing({ message, problemText }: ExampleDrawingProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Try to parse drawing instructions from the message
  const instructions = parseDrawingInstructions(message);

  // Check if message mentions drawing examples
  const hasDrawingMention = /(draw|example|diagram|visual|set up|here's how)/i.test(message);

  // If no instructions found but message mentions drawing, show placeholder
  if (instructions.length === 0 && !hasDrawingMention) {
    return null;
  }

  if (instructions.length === 0) {
    // Message mentions drawing but no structured instructions
    // Could show a message encouraging the student to use the whiteboard
    return null;
  }

  return (
    <div className="mt-3 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
            📐 Example Drawing
          </span>
          <span className="text-xs text-indigo-600 dark:text-indigo-400">
            AI-generated example
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
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
      </div>

      {isExpanded && (
        <div className="space-y-2">
          <p className="text-xs text-indigo-700 dark:text-indigo-300">
            This is an example of how to visualize this problem. Try recreating it on your whiteboard!
          </p>
          <ExampleDrawingRenderer instructions={instructions} />
          <button
            onClick={() => {
              // Copy instructions to clipboard or show hint
              const instructionText = JSON.stringify(instructions, null, 2);
              navigator.clipboard.writeText(instructionText).then(() => {
                // Could show a toast notification
              });
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline"
          >
            Copy drawing instructions
          </button>
        </div>
      )}
    </div>
  );
}

