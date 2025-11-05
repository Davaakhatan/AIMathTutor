"use client";

import { useState } from "react";
import { ParsedProblem } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/useToast";

interface BookmarkButtonProps {
  problem: ParsedProblem | null;
}

interface BookmarkedProblem extends ParsedProblem {
  bookmarkedAt: number;
  id: string;
}

/**
 * Bookmark/favorite a problem for quick access
 */
export default function BookmarkButton({ problem }: BookmarkButtonProps) {
  const [bookmarks, setBookmarks] = useLocalStorage<BookmarkedProblem[]>("aitutor-bookmarks", []);
  const { showToast } = useToast();

  if (!problem) return null;

  const isBookmarked = bookmarks.some((b) => b.text === problem.text);

  const handleToggle = () => {
    if (isBookmarked) {
      // Remove bookmark
      setBookmarks((prev) => prev.filter((b) => b.text !== problem.text));
      showToast("Bookmark removed", "info");
    } else {
      // Add bookmark
      const newBookmark: BookmarkedProblem = {
        ...problem,
        id: Date.now().toString(),
        bookmarkedAt: Date.now(),
      };
      setBookmarks((prev) => [newBookmark, ...prev]);
      showToast("Problem bookmarked!", "success");
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-all active:scale-95 touch-device:min-h-[44px] touch-device:min-w-[44px] ${
        isBookmarked
          ? "text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
          : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark problem"}
      title={isBookmarked ? "Bookmarked" : "Bookmark this problem"}
    >
      <svg className="w-5 h-5" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    </button>
  );
}

