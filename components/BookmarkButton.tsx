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
      className={`p-2 rounded-lg transition-colors ${
        isBookmarked
          ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
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

