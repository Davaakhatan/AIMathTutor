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
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-sm font-medium text-red-900">Something went wrong</h3>
          </div>
          <p className="text-sm text-red-700 mb-3">{error}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Try Again
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              {isExpanded ? "Hide" : "Show"} Help
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-xs text-red-600 mb-2 font-medium">Troubleshooting tips:</p>
              <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                <li>Check your internet connection</li>
                <li>Refresh the page and try again</li>
                <li>Make sure you&apos;re not sending too many requests</li>
                <li>Try starting a new problem</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

