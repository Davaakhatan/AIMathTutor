"use client";

import { memo } from "react";
import { parseDrawingSuggestions, DrawingSuggestion } from "../ai/DrawingSuggestionParser";

interface DrawingSuggestionsProps {
  message: string;
  onSuggestionClick?: (suggestion: DrawingSuggestion) => void;
}

function DrawingSuggestions({ message, onSuggestionClick }: DrawingSuggestionsProps) {
  const suggestions = parseDrawingSuggestions(message);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span>Drawing Suggestions</span>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick?.(suggestion)}
            className="w-full text-left text-xs px-2.5 py-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
          >
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
                {getSuggestionIcon(suggestion.type)}
              </span>
              <span className="text-gray-700 dark:text-gray-300 flex-1">
                {suggestion.action}
              </span>
              <svg 
                className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getSuggestionIcon(type: DrawingSuggestion["type"]): string {
  switch (type) {
    case "line":
      return "📏";
    case "shape":
      return "🔷";
    case "label":
      return "🏷️";
    case "highlight":
      return "✨";
    case "annotation":
      return "📝";
    default:
      return "✏️";
  }
}

export default memo(DrawingSuggestions);

