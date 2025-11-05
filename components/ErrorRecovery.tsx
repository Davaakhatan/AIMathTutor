"use client";

import { useState } from "react";

interface ErrorRecoveryProps {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * Error recovery component with retry and helpful actions
 */
export default function ErrorRecovery({ error, onRetry, onDismiss }: ErrorRecoveryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-sm font-medium text-red-900 dark:text-red-100 transition-colors">Something went wrong</h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-3 transition-colors">{error}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-2 active:scale-95 touch-device:min-h-[44px]"
            >
              Try Again
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors active:scale-95 touch-device:min-h-[44px]"
            >
              {isExpanded ? "Hide" : "Show"} Help
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors active:scale-95 touch-device:min-h-[44px]"
            >
              Dismiss
            </button>
          </div>
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 transition-colors">
              <p className="text-xs text-red-600 dark:text-red-400 mb-2 font-medium transition-colors">Troubleshooting tips:</p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside transition-colors">
                <li>Check your internet connection</li>
                <li>Refresh the page and try again</li>
                <li>Make sure you&apos;re not sending too many requests</li>
                <li>Try starting a new problem</li>
                <li>Check your OpenAI API key in Settings</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

