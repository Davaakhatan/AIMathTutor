/**
 * Hook for problem history that syncs with Supabase
 * Replaces direct localStorage usage
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProblems, saveProblem, updateProblem, type ProblemData } from "@/services/supabaseDataService";
import { logger } from "@/lib/logger";
import { ParsedProblem } from "@/types";

interface SavedProblem extends ParsedProblem {
  id: string;
  savedAt?: number;
  isBookmarked?: boolean;
  difficulty?: string;
  hintsUsed?: number;
  exchanges?: number;
}

/**
 * Hook for problem history that syncs with database
 */
export function useProblemHistory() {
  const { user, activeProfile } = useAuth();
  const [problems, setProblems] = useState<SavedProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from database on mount or when user/profile changes
  useEffect(() => {
    if (!user) {
      // Guest mode - use localStorage only
      try {
        const localData = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
        setProblems(localData);
      } catch (error) {
        logger.error("Error loading problem history from localStorage", { error });
        setProblems([]);
      }
      setIsLoading(false);
      return;
    }

    const loadProblems = async () => {
      try {
        setIsLoading(true);
        const dbProblems = await getProblems(user.id, 100, activeProfile?.id || null);
        
        // Convert to SavedProblem format
        const savedProblems: SavedProblem[] = dbProblems.map((p) => {
          const parsedData = p.parsed_data as any;
          return {
            id: p.id || Date.now().toString(),
            text: p.text,
            type: p.type as any,
            confidence: 1.0,
            savedAt: p.solved_at ? new Date(p.solved_at).getTime() : Date.now(),
            isBookmarked: p.is_bookmarked || false,
            imageUrl: p.image_url || undefined,
            difficulty: p.difficulty || parsedData?.difficulty,
            hintsUsed: p.hints_used || parsedData?.hintsUsed,
            exchanges: parsedData?.exchanges,
          };
        });

        setProblems(savedProblems);
        
        // Also update localStorage for offline support
        localStorage.setItem("aitutor-problem-history", JSON.stringify(savedProblems));
      } catch (error) {
        logger.error("Error loading problem history from database", { error });
        // Fallback to localStorage
        try {
          const localData = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
          setProblems(localData);
        } catch (e) {
          setProblems([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProblems();
  }, [user?.id, activeProfile?.id]);

  // Add problem to history (saves to both localStorage and database)
  const addProblem = useCallback(async (problem: ParsedProblem) => {
    const newProblem: SavedProblem = {
      ...problem,
      id: Date.now().toString(),
      savedAt: Date.now(),
      isBookmarked: false,
    };

    // Update local state immediately (optimistic update)
    setProblems((prev) => {
      const filtered = prev.filter((p) => p.text !== problem.text);
      return [newProblem, ...filtered].slice(0, 100);
    });

    // Update localStorage
    const updated = [newProblem, ...problems.filter((p) => p.text !== problem.text)].slice(0, 100);
    localStorage.setItem("aitutor-problem-history", JSON.stringify(updated));

    // Save to database if authenticated
    if (user) {
      try {
        setIsSyncing(true);
        const problemData: ProblemData = {
          text: problem.text,
          type: problem.type || "unknown",
          difficulty: undefined,
          image_url: problem.imageUrl,
          parsed_data: problem,
          is_bookmarked: false,
          is_generated: false,
          source: "user_input",
        };

        await saveProblem(user.id, problemData, activeProfile?.id || null);
      } catch (error) {
        logger.error("Error saving problem to database", { error });
        // Don't revert - localStorage is the fallback
      } finally {
        setIsSyncing(false);
      }
    }
  }, [user, activeProfile?.id, problems]);

  // Toggle bookmark (updates both localStorage and database)
  const toggleBookmark = useCallback(async (problemId: string, isBookmarked: boolean) => {
    // Update local state
    setProblems((prev) =>
      prev.map((p) => (p.id === problemId ? { ...p, isBookmarked } : p))
    );

    // Update localStorage
    const updated = problems.map((p) => (p.id === problemId ? { ...p, isBookmarked } : p));
    localStorage.setItem("aitutor-problem-history", JSON.stringify(updated));

    // Update database if authenticated
    if (user) {
      try {
        setIsSyncing(true);
        await updateProblem(user.id, problemId, { is_bookmarked: isBookmarked });
      } catch (error) {
        logger.error("Error updating bookmark in database", { error });
      } finally {
        setIsSyncing(false);
      }
    }
  }, [user, problems]);

  return {
    problems,
    isLoading,
    isSyncing,
    addProblem,
    toggleBookmark,
  };
}

