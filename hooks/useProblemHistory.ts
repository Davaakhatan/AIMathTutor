/**
 * Hook for problem history that syncs with Supabase
 * Replaces direct localStorage usage
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProblems, saveProblem, updateProblem, deleteProblem, type ProblemData } from "@/services/supabaseDataService";
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
  // ✅ CORRECT PATTERN: Database-first with localStorage fallback
  // 1. Load database (source of truth)
  // 2. Cache to localStorage
  // 3. If database fails, fallback to localStorage (offline mode)
  useEffect(() => {
    let isMounted = true;
    
    if (!user) {
      // Guest mode - use localStorage only (no database access)
      try {
        const localData = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
        if (isMounted) {
          setProblems(localData);
          setIsLoading(false);
        }
      } catch (error) {
        logger.error("Error loading problem history from localStorage", { error });
        if (isMounted) {
          setProblems([]);
          setIsLoading(false);
        }
      }
      return;
    }

    // For logged-in users: Database-first pattern
    const loadFromDatabase = async () => {
      setIsLoading(true);
      
      try {
        // STEP 1: Load from database (source of truth)
        const dbProblems = await getProblems(user.id, 100, activeProfile?.id || null);
        
        if (!isMounted) return;
        
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

        // STEP 2: Update state with database data (source of truth)
        setProblems(savedProblems);
        
        // STEP 3: Cache to localStorage (for offline support)
        localStorage.setItem("aitutor-problem-history", JSON.stringify(savedProblems));
        
        setIsLoading(false);
      } catch (error) {
        logger.error("Error loading problem history from database", { error });
        
        // STEP 4: Fallback to localStorage if database fails (offline mode)
        if (isMounted) {
          try {
            const cachedData = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
            setProblems(cachedData);
          } catch (cacheError) {
            logger.error("Error loading from localStorage fallback", { cacheError });
            setProblems([]);
          }
          setIsLoading(false);
        }
      }
    };
    
    loadFromDatabase();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, activeProfile?.id]); // Only depend on IDs, not full objects

  // Add problem to history (optimistic update with revert on error)
  const addProblem = useCallback(async (problem: ParsedProblem) => {
    const newProblem: SavedProblem = {
      ...problem,
      id: Date.now().toString(),
      savedAt: Date.now(),
      isBookmarked: false,
    };

    // STEP 1: Optimistic update (immediate UI)
    const previousProblems = problems;
    setProblems((prev) => {
      const filtered = prev.filter((p) => p.text !== problem.text);
      const updated = [newProblem, ...filtered].slice(0, 100);
      // Update localStorage cache
      localStorage.setItem("aitutor-problem-history", JSON.stringify(updated));
      return updated;
    });

    // STEP 2: Save to database (in background)
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
        setIsSyncing(false);
      } catch (error) {
        logger.error("Error saving problem to database", { error });
        // STEP 3: Revert on error
        setProblems(previousProblems);
        localStorage.setItem("aitutor-problem-history", JSON.stringify(previousProblems));
        setIsSyncing(false);
      }
    }
  }, [user?.id, activeProfile?.id, problems]);

  // Toggle bookmark (updates both localStorage and database)
  const toggleBookmark = useCallback(async (problemId: string, isBookmarked: boolean) => {
    // Update local state immediately (optimistic update)
    setProblems((prev) => {
      const updated = prev.map((p) => (p.id === problemId ? { ...p, isBookmarked } : p));
      // Also update localStorage
      localStorage.setItem("aitutor-problem-history", JSON.stringify(updated));
      return updated;
    });

    // Update database if authenticated (in background)
    if (user) {
      try {
        setIsSyncing(true);
        await updateProblem(user.id, problemId, { is_bookmarked: isBookmarked });
      } catch (error) {
        logger.error("Error updating bookmark in database", { error });
        // Revert on error
        setProblems((prev) => {
          const reverted = prev.map((p) => (p.id === problemId ? { ...p, isBookmarked: !isBookmarked } : p));
          localStorage.setItem("aitutor-problem-history", JSON.stringify(reverted));
          return reverted;
        });
      } finally {
        setIsSyncing(false);
      }
    }
  }, [user?.id]);

  // Delete problem (removes from both localStorage and database)
  const removeProblem = useCallback(async (problemId: string) => {
    // Update local state immediately (optimistic update)
    setProblems((prev) => {
      const updated = prev.filter((p) => p.id !== problemId);
      // Also update localStorage
      localStorage.setItem("aitutor-problem-history", JSON.stringify(updated));
      return updated;
    });

    // Delete from database if authenticated (in background)
    if (user) {
      try {
        setIsSyncing(true);
        const success = await deleteProblem(user.id, problemId, activeProfile?.id || null);
        if (!success) {
          // Revert on error - reload from database
          const dbProblems = await getProblems(user.id, 100, activeProfile?.id || null);
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
          localStorage.setItem("aitutor-problem-history", JSON.stringify(savedProblems));
        }
      } catch (error) {
        logger.error("Error deleting problem from database", { error });
        // Revert on error - reload from database
        try {
          const dbProblems = await getProblems(user.id, 100, activeProfile?.id || null);
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
          localStorage.setItem("aitutor-problem-history", JSON.stringify(savedProblems));
        } catch (e) {
          // Ignore
        }
      } finally {
        setIsSyncing(false);
      }
    }
  }, [user?.id, activeProfile?.id]);

  return {
    problems,
    isLoading,
    isSyncing,
    addProblem,
    toggleBookmark,
    removeProblem,
  };
}

