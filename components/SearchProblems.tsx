"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ParsedProblem } from "@/types";

interface SavedProblem extends ParsedProblem {
  savedAt: number;
  id: string;
}

interface SearchProblemsProps {
  onSelectProblem: (problem: ParsedProblem) => void;
}

/**
 * Global search for problems across history
 */
export default function SearchProblems({ onSelectProblem }: SearchProblemsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [savedProblems] = useLocalStorage<SavedProblem[]>("aitutor-problem-history", []);
  const [bookmarks] = useLocalStorage<SavedProblem[]>("aitutor-bookmarks", []);

  const allProblems = [...bookmarks.map((b) => ({ ...b, isBookmarked: true })), ...savedProblems.map((p) => ({ ...p, isBookmarked: false }))];
  
  const filteredProblems = query.trim()
    ? allProblems.filter((p) =>
        p.text.toLowerCase().includes(query.toLowerCase()) ||
        (p.type && p.type.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-28 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm text-gray-600 dark:text-gray-300"
        aria-label="Search problems"
        title="Search Problems (Ctrl+K)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs border border-gray-200 dark:border-gray-700 transition-colors">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[70vh] flex flex-col transition-colors">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems by text or type..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            autoFocus
          />
          <button
            onClick={() => {
              setIsOpen(false);
              setQuery("");
            }}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close search"
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

        <div className="flex-1 overflow-y-auto p-4">
          {query.trim() === "" ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Start typing to search problems</p>
              <p className="text-xs mt-2">Search across all saved problems and bookmarks</p>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No problems found</p>
              <p className="text-xs mt-2">Try different keywords</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProblems.map((problem) => (
                <button
                  key={problem.id || `search-${problem.text}`}
                  onClick={() => {
                    onSelectProblem(problem);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium line-clamp-2 mb-1 transition-colors">
                        {problem.text}
                      </p>
                      <div className="flex items-center gap-2">
                        {problem.type && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 uppercase transition-colors">
                            {problem.type.replace("_", " ")}
                          </span>
                        )}
                        {(problem as any).isBookmarked && (
                          <span className="text-xs text-yellow-500 dark:text-yellow-400 transition-colors">★ Bookmarked</span>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

