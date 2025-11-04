"use client";

import { useState, useEffect, useRef } from "react";
import { ParsedProblem } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface SavedProblem extends ParsedProblem {
  savedAt: number;
  id: string;
}

interface ProblemHistoryProps {
  onSelectProblem: (problem: ParsedProblem) => void;
}

/**
 * Component to view and manage saved problem history
 */
export default function ProblemHistory({ onSelectProblem }: ProblemHistoryProps) {
  const [savedProblems, setSavedProblems] = useLocalStorage<SavedProblem[]>("aitutor-problem-history", []);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const panelRef = useRef<HTMLDivElement>(null);

  const filteredProblems = savedProblems.filter((p) =>
    p.text.toLowerCase().includes(filter.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSaveCurrent = (problem: ParsedProblem) => {
    const newProblem: SavedProblem = {
      ...problem,
      id: Date.now().toString(),
      savedAt: Date.now(),
    };
    setSavedProblems((prev) => [newProblem, ...prev.slice(0, 19)]); // Keep last 20
  };

  const handleDelete = (id: string) => {
    setSavedProblems((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSelect = (problem: SavedProblem) => {
    onSelectProblem(problem);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-gray-900 text-white rounded-full p-3 shadow-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        aria-label="Open problem history"
        title="Problem History"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="fixed bottom-4 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Problem History</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{savedProblems.length} saved</span>
          {savedProblems.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear all problem history?")) {
                  setSavedProblems([]);
                }
              }}
              className="text-xs text-gray-400 hover:text-red-600 transition-colors"
              title="Clear all"
            >
              Clear
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Close history"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {savedProblems.length > 5 && (
        <div className="px-4 pt-3 pb-2 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search problems..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredProblems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No saved problems yet</p>
            <p className="text-xs mt-1">Problems you work on will be saved here</p>
          </div>
        ) : (
          filteredProblems.map((problem) => (
            <div
              key={problem.id}
              className="group p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-900 font-medium line-clamp-2 mb-1">
                    {problem.text}
                  </p>
                  <div className="flex items-center gap-2">
                    {problem.type && (
                      <span className="text-xs text-gray-400 uppercase">
                        {problem.type.replace("_", " ")}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(problem.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleSelect(problem)}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Select problem"
                    title="Use this problem"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(problem.id)}
                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    aria-label="Delete problem"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

