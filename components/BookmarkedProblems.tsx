"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProblemHistory } from "@/hooks/useProblemHistory";
import { ParsedProblem, ProblemType } from "@/types";

interface BookmarkedProblem extends ParsedProblem {
  bookmarkedAt: number;
  id: string;
}

interface BookmarkedProblemsProps {
  onSelectProblem: (problem: ParsedProblem) => void;
}

/**
 * View and manage bookmarked problems
 */
export default function BookmarkedProblems({ onSelectProblem }: BookmarkedProblemsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { problems: savedProblems, toggleBookmark } = useProblemHistory();
  const bookmarks = savedProblems.filter(p => p.isBookmarked).map(p => ({
    ...p,
    bookmarkedAt: p.savedAt || Date.now(),
  }));
  const [sortBy, setSortBy] = useState<"recent" | "type">("recent");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Sort bookmarks
  const sortedBookmarks = [...bookmarks].sort((a, b) => {
    if (sortBy === "recent") {
      return b.bookmarkedAt - a.bookmarkedAt; // Newest first
    } else {
      // Handle undefined types
      const typeA = a.type || "";
      const typeB = b.type || "";
      return typeA.localeCompare(typeB); // By type
    }
  });

  const handleRemoveBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id) {
      toggleBookmark(id, false);
    }
  };

  const handleSelectProblem = (problem: BookmarkedProblem) => {
    onSelectProblem(problem);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-40 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-3 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
        style={{ bottom: "3rem" }}
        aria-label="View bookmarked problems"
        title="Bookmarked Problems"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {bookmarks.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {bookmarks.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={() => setIsOpen(false)} />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed bottom-4 right-4 z-50 w-full max-w-md max-h-[80vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors">
              Bookmarked Problems
            </h3>
            {bookmarks.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors">({bookmarks.length})</span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sort Controls */}
        {bookmarks.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Sort by:</span>
            <button
              onClick={() => setSortBy("recent")}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                sortBy === "recent"
                  ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy("type")}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                sortBy === "type"
                  ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              Type
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {bookmarks.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-sm font-medium">No bookmarks yet</p>
              <p className="text-xs mt-1">Click the bookmark icon on problems to save them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  onClick={() => handleSelectProblem(bookmark)}
                  className="group p-3 bg-gray-50 dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-600 rounded-lg cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {bookmark.type && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            {bookmark.type.replace("_", " ").toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500 transition-colors">
                          {new Date(bookmark.bookmarkedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-yellow-900 dark:group-hover:text-yellow-200 transition-colors">
                        {bookmark.text}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleRemoveBookmark(bookmark.id, e)}
                      className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Remove bookmark"
                      title="Remove bookmark"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {bookmarks.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                if (confirm("Are you sure you want to remove all bookmarks?")) {
                  // Clear bookmarks by unbookmarking all (database sync handled by hook)
                  bookmarks.forEach(b => {
                    if (b.id) toggleBookmark(b.id, false);
                  });
                }
              }}
              className="text-xs text-red-600 hover:text-red-700 transition-colors"
            >
              Clear all bookmarks
            </button>
          </div>
        )}
      </div>
    </>
  );
}

