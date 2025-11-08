/**
 * Hook for challenge history that syncs with Supabase
 * Similar to useProblemHistory but for challenges
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getChallenges, saveChallenge, updateChallenge, type ChallengeData } from "@/services/supabaseDataService";
import { logger } from "@/lib/logger";

interface SavedChallenge {
  id: string;
  challenge_text: string;
  challenge_type?: string;
  problem_type?: string;
  difficulty?: string;
  share_code?: string;
  challenger_id?: string;
  solvedAt?: number;
  isCompleted: boolean;
  attempts?: number;
  hintsUsed?: number;
  timeSpent?: number;
}

/**
 * Hook for challenge history that syncs with database
 */
export function useChallengeHistory() {
  const { user, activeProfile } = useAuth();
  const [challenges, setChallenges] = useState<SavedChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from database on mount or when user/profile changes
  // BEST PRACTICE: Database is ALWAYS the source of truth for logged-in users
  // localStorage is ONLY used for:
  // 1. Guest users (no database access)
  // 2. Performance cache (optional, doesn't affect data persistence)
  useEffect(() => {
    let isMounted = true;
    
    if (!user) {
      // Guest mode - use localStorage only (no database access)
      try {
        const localData = JSON.parse(localStorage.getItem("aitutor-challenge-history") || "[]");
        if (isMounted) {
          setChallenges(localData);
          setIsLoading(false);
        }
      } catch (error) {
        logger.error("Error loading challenge history from localStorage", { error });
        if (isMounted) {
          setChallenges([]);
          setIsLoading(false);
        }
      }
      return;
    }

    // For logged-in users: Support both OFFLINE and ONLINE modes
    // STEP 1: Show cached data immediately (OFFLINE support - instant UI)
    try {
      const cachedData = JSON.parse(localStorage.getItem("aitutor-challenge-history") || "[]");
      if (isMounted) {
        setChallenges(cachedData);
        setIsLoading(false); // Show cached data immediately (works offline)
      }
    } catch (error) {
      // Ignore cache errors, will load from database
    }

    // STEP 2: Sync from database in background (ONLINE support - source of truth)
    // This ensures data is consistent across all devices and sessions
    const syncFromDatabase = async () => {
      try {
        // Load from database (source of truth - works across all devices)
        const dbChallenges = await getChallenges(user.id, 100, activeProfile?.id || null);
        
        if (!isMounted) return;
        
        // Convert to SavedChallenge format
        const savedChallenges: SavedChallenge[] = dbChallenges.map((c) => ({
          id: c.id || Date.now().toString(),
          challenge_text: c.challenge_text,
          challenge_type: c.challenge_type,
          problem_type: c.problem_type,
          difficulty: c.difficulty,
          share_code: c.share_code,
          challenger_id: c.challenger_id,
          solvedAt: c.solved_at ? new Date(c.solved_at).getTime() : undefined,
          isCompleted: c.is_completed || false,
          attempts: c.attempts || 0,
          hintsUsed: c.hints_used || 0,
          timeSpent: c.time_spent || 0,
        }));

        // Update state with database data (source of truth)
        // This will overwrite cached data with the real database data
        setChallenges(savedChallenges);
        
        // Update localStorage cache (for offline support and performance)
        localStorage.setItem("aitutor-challenge-history", JSON.stringify(savedChallenges));
      } catch (error) {
        logger.error("Error loading challenge history from database", { error });
        // If database fails (offline), keep cached data (already shown in STEP 1)
        // This provides offline support - user can still see their cached challenges
      }
    };
    
    // Sync from database in background (non-blocking)
    syncFromDatabase();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, activeProfile?.id]); // Only depend on IDs, not full objects

  // Add challenge to history (saves to both localStorage and database)
  const addChallenge = useCallback(async (challenge: ChallengeData) => {
    // Update local state immediately (optimistic update)
    const newChallenge: SavedChallenge = {
      id: Date.now().toString(),
      challenge_text: challenge.challenge_text,
      challenge_type: challenge.challenge_type,
      problem_type: challenge.problem_type,
      difficulty: challenge.difficulty,
      share_code: challenge.share_code,
      challenger_id: challenge.challenger_id,
      solvedAt: challenge.solved_at ? new Date(challenge.solved_at).getTime() : undefined,
      isCompleted: challenge.is_completed || false,
      attempts: challenge.attempts || 0,
      hintsUsed: challenge.hints_used || 0,
      timeSpent: challenge.time_spent || 0,
    };

    setChallenges((prev) => {
      const updated = [newChallenge, ...prev].slice(0, 100);
      // Also update localStorage
      localStorage.setItem("aitutor-challenge-history", JSON.stringify(updated));
      return updated;
    });

    // Save to database if authenticated (in background)
    if (user) {
      try {
        setIsSyncing(true);
        await saveChallenge(user.id, challenge, activeProfile?.id || null);
      } catch (error) {
        logger.error("Error saving challenge to database", { error });
        // Don't revert - localStorage is the fallback
      } finally {
        setIsSyncing(false);
      }
    }
  }, [user?.id, activeProfile?.id]);

  // Update challenge (e.g., mark as completed)
  const updateChallengeStatus = useCallback(async (challengeId: string, updates: Partial<ChallengeData>) => {
    // Update local state immediately (optimistic update)
    setChallenges((prev) => {
      const updated = prev.map((c) => 
        c.id === challengeId 
          ? { 
              ...c, 
              ...(updates.is_completed !== undefined && { isCompleted: updates.is_completed }),
              ...(updates.solved_at && { solvedAt: new Date(updates.solved_at).getTime() }),
              ...(updates.attempts !== undefined && { attempts: updates.attempts }),
              ...(updates.hints_used !== undefined && { hintsUsed: updates.hints_used }),
              ...(updates.time_spent !== undefined && { timeSpent: updates.time_spent }),
            }
          : c
      );
      // Also update localStorage
      localStorage.setItem("aitutor-challenge-history", JSON.stringify(updated));
      return updated;
    });

    // Update database if authenticated (in background)
    if (user) {
      try {
        setIsSyncing(true);
        await updateChallenge(user.id, challengeId, updates);
      } catch (error) {
        logger.error("Error updating challenge in database", { error });
        // Revert on error
        setChallenges((prev) => {
          const reverted = prev.map((c) => 
            c.id === challengeId 
              ? { 
                  ...c, 
                  ...(updates.is_completed !== undefined && { isCompleted: !updates.is_completed }),
                }
              : c
          );
          localStorage.setItem("aitutor-challenge-history", JSON.stringify(reverted));
          return reverted;
        });
      } finally {
        setIsSyncing(false);
      }
    }
  }, [user?.id]);

  return {
    challenges,
    isLoading,
    isSyncing,
    addChallenge,
    updateChallengeStatus,
  };
}

