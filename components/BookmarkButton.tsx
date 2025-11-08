"use client";

import { useState, useEffect } from "react";
import { ParsedProblem } from "@/types";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { updateProblem } from "@/services/supabaseDataService";
import { logger } from "@/lib/logger";

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
  const { user, activeProfile } = useAuth();
  const { showToast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Check if problem is bookmarked (from localStorage for now, will be from DB)
  useEffect(() => {
    if (!problem) return;
    
    try {
      const bookmarks = JSON.parse(localStorage.getItem("aitutor-bookmarks") || "[]");
      const problemHistory = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
      
      // Check both bookmarks array and problem history for bookmark flag
      const isInBookmarks = bookmarks.some((b: any) => b.text === problem.text);
      const problemInHistory = problemHistory.find((p: any) => p.text === problem.text);
      const isBookmarkedInHistory = problemInHistory?.isBookmarked || false;
      
      setIsBookmarked(isInBookmarks || isBookmarkedInHistory);
    } catch (error) {
      logger.error("Error checking bookmark status", { error });
    }
  }, [problem]);

  const handleToggle = async () => {
    if (!problem || isToggling) return;

    setIsToggling(true);
    const newBookmarkState = !isBookmarked;

    try {
      // Update localStorage immediately (optimistic update)
      const problemHistory = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
      const updatedHistory = problemHistory.map((p: any) =>
        p.text === problem.text ? { ...p, isBookmarked: newBookmarkState } : p
      );
      localStorage.setItem("aitutor-problem-history", JSON.stringify(updatedHistory));

      // Update bookmarks array
      const bookmarks = JSON.parse(localStorage.getItem("aitutor-bookmarks") || "[]");
      if (newBookmarkState) {
        // Add to bookmarks if not already there
        if (!bookmarks.some((b: any) => b.text === problem.text)) {
          const newBookmark: BookmarkedProblem = {
            ...problem,
            id: Date.now().toString(),
            bookmarkedAt: Date.now(),
          };
          localStorage.setItem("aitutor-bookmarks", JSON.stringify([newBookmark, ...bookmarks]));
        }
      } else {
        // Remove from bookmarks
        localStorage.setItem("aitutor-bookmarks", JSON.stringify(bookmarks.filter((b: any) => b.text !== problem.text)));
      }

      setIsBookmarked(newBookmarkState);
      showToast(newBookmarkState ? "Problem bookmarked!" : "Bookmark removed", newBookmarkState ? "success" : "info");

      // Update database if authenticated
      if (user) {
        try {
          // Find problem ID in history
          const problemInHistory = problemHistory.find((p: any) => p.text === problem.text);
          if (problemInHistory?.id) {
            await updateProblem(user.id, problemInHistory.id, {
              is_bookmarked: newBookmarkState,
            });
          } else {
            // Problem not in database yet, but that's okay - it will be saved when problem is solved
            logger.debug("Problem not found in database for bookmark update", { problemText: problem.text });
          }
        } catch (error) {
          logger.error("Error updating bookmark in database", { error });
          // Don't revert - localStorage is the fallback
        }
      }
    } catch (error) {
      logger.error("Error toggling bookmark", { error });
      showToast("Error updating bookmark", "error");
    } finally {
      setIsToggling(false);
    }
  };

  if (!problem) return null;

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

