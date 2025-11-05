"use client";

import { useState, useEffect } from "react";
import { ParsedProblem, ProblemType } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface SavedProblem extends ParsedProblem {
  savedAt: number;
  id: string;
}

interface BookmarkedProblem extends ParsedProblem {
  bookmarkedAt: number;
  id: string;
}

interface HistoryContentProps {
  onSelectProblem: (problem: ParsedProblem) => void;
}

type SortOption = "recent" | "oldest" | "type" | "alphabetical";
type FilterType = "all" | ProblemType;
type ViewMode = "all" | "bookmarked";

/**
 * History Content - Problem history and bookmarks
 */
export default function HistoryContent({ onSelectProblem }: HistoryContentProps) {
  const [savedProblems, setSavedProblems] = useLocalStorage<SavedProblem[]>("aitutor-problem-history", []);
  const [bookmarks, setBookmarks] = useLocalStorage<BookmarkedProblem[]>("aitutor-bookmarks", []);
  const [filter, setFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only rendering badge after client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Combine saved problems and bookmarks, mark which are bookmarked
  const allProblems = [
    ...savedProblems.map(p => ({ ...p, isBookmarked: bookmarks.some(b => b.text === p.text) })),
    ...bookmarks.filter(b => !savedProblems.some(p => p.text === b.text)).map(b => ({ 
      ...b, 
      savedAt: b.bookmarkedAt,
      isBookmarked: true 
    }))
  ];

  const filteredProblems = allProblems
    .filter((p) => {
      // Filter by view mode (all vs bookmarked)
      if (viewMode === "bookmarked" && !p.isBookmarked) return false;
      
      const matchesText = p.text.toLowerCase().includes(filter.toLowerCase());
      // Handle both string comparison and enum comparison
      const matchesType = filterType === "all" || 
        p.type === filterType || 
        (p.type && String(p.type).toLowerCase() === String(filterType).toLowerCase());
      return matchesText && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return b.savedAt - a.savedAt;
        case "oldest":
          return a.savedAt - b.savedAt;
        case "type":
          return (a.type || "").localeCompare(b.type || "");
        case "alphabetical":
          return a.text.localeCompare(b.text);
        default:
          return 0;
      }
    });

  const handleDelete = (id: string) => {
    setSavedProblems((prev) => prev.filter((p) => p.id !== id));
    // Also remove from bookmarks if bookmarked
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleToggleBookmark = (problem: SavedProblem | BookmarkedProblem, e: React.MouseEvent) => {
    e.stopPropagation();
    const isBookmarked = bookmarks.some(b => b.text === problem.text);
    
    if (isBookmarked) {
      // Remove bookmark
      setBookmarks((prev) => prev.filter((b) => b.text !== problem.text));
    } else {
      // Add bookmark
      const newBookmark: BookmarkedProblem = {
        ...problem,
        id: problem.id || Date.now().toString(),
        bookmarkedAt: Date.now(),
      };
      setBookmarks((prev) => [newBookmark, ...prev]);
    }
  };

  const handleSelect = (problem: SavedProblem | BookmarkedProblem) => {
    onSelectProblem(problem);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs for All vs Bookmarked */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setViewMode("all")}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            viewMode === "all"
              ? "text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setViewMode("bookmarked")}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors relative ${
            viewMode === "bookmarked"
              ? "text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Bookmarked
          {bookmarks.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
              {bookmarks.length}
            </span>
          )}
        </button>
      </div>

      {filteredProblems.length > 0 && (
        <div className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <input
            type="text"
            placeholder="Search problems..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
          />
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
            >
              <option value="all">All Types</option>
              <option value={ProblemType.ARITHMETIC}>Arithmetic</option>
              <option value={ProblemType.ALGEBRA}>Algebra</option>
              <option value={ProblemType.GEOMETRY}>Geometry</option>
              <option value={ProblemType.WORD_PROBLEM}>Word Problems</option>
              <option value={ProblemType.MULTI_STEP}>Multi-Step</option>
              <option value={ProblemType.UNKNOWN}>Other</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
            >
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="type">By Type</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredProblems.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm transition-colors">
              {viewMode === "bookmarked" ? "No bookmarked problems yet" : "No saved problems yet"}
            </p>
            <p className="text-xs mt-1 transition-colors">
              {viewMode === "bookmarked" 
                ? "Click the bookmark icon on problems to save them here"
                : "Problems you work on will be saved here"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filteredProblems.length} {filteredProblems.length === 1 ? "problem" : "problems"}
              </span>
              {filteredProblems.length > 0 && (
                <button
                  onClick={() => {
                    const message = viewMode === "bookmarked" 
                      ? "Clear all bookmarks?" 
                      : "Clear all problem history?";
                    if (confirm(message)) {
                      if (viewMode === "bookmarked") {
                        setBookmarks([]);
                      } else {
                        setSavedProblems([]);
                      }
                    }
                  }}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                  title="Clear all"
                >
                  Clear
                </button>
              )}
            </div>
            {filteredProblems.map((problem) => (
              <div
                key={problem.id}
                className="group p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-900 dark:text-gray-100 font-medium line-clamp-2 flex-1 transition-colors">
                        {problem.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {problem.type && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 uppercase transition-colors">
                          {problem.type.replace("_", " ")}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500 transition-colors">
                        {new Date(problem.savedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleToggleBookmark(problem, e)}
                      className={`p-1.5 rounded transition-colors ${
                        (problem as any).isBookmarked
                          ? "text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                          : "text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                      aria-label={(problem as any).isBookmarked ? "Remove bookmark" : "Bookmark problem"}
                      title={(problem as any).isBookmarked ? "Remove bookmark" : "Bookmark this problem"}
                    >
                      <svg className="w-4 h-4" fill={(problem as any).isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleSelect(problem)}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
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
                      className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
            ))}
          </>
        )}
      </div>
    </div>
  );
}

