"use client";

import { ParsedProblem } from "@/types";

interface QuickActionsProps {
  problem: ParsedProblem | null;
  onNewProblem: () => void;
  onExport?: () => void;
  hasConversation?: boolean;
}

/**
 * Quick action buttons for common tasks
 */
export default function QuickActions({
  problem,
  onNewProblem,
  onExport,
  hasConversation = false,
}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {hasConversation && onExport && (
        <button
          onClick={onExport}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-light px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          aria-label="Export conversation"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export
        </button>
      )}
      {problem && (
        <button
          onClick={onNewProblem}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-light px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          aria-label="Start new problem"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Problem
        </button>
      )}
    </div>
  );
}

