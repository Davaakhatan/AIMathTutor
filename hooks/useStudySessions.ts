"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudySessions, saveStudySession, StudySession } from "@/services/supabaseDataService";
import { useLocalStorage } from "./useLocalStorage";
import { logger } from "@/lib/logger";

/**
 * Hook to manage study sessions with Supabase persistence
 * Falls back to localStorage for guest users
 */
export function useStudySessions() {
  const { user, activeProfile } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localSessions, setLocalSessions] = useLocalStorage<StudySession[]>("aitutor-study-sessions", []);

  // Load study sessions - Database-first pattern with localStorage fallback
  useEffect(() => {
    let isMounted = true;
    
    if (!user) {
      // Guest mode - use localStorage only
      setSessions(localSessions);
      setIsLoading(false);
      return;
    }

    // For logged-in users: Database-first pattern
    const loadFromDatabase = async () => {
      setIsLoading(true);
      
      try {
        // STEP 1: Load from database (source of truth)
        const data = await getStudySessions(user.id, 100, activeProfile?.id || null);
        
        if (!isMounted) return;
        
        if (data && data.length > 0) {
          // STEP 2: Update state with database data
          setSessions(data);
          
          // STEP 3: Cache to localStorage
          setLocalSessions(data);
        } else {
          // No data in database, use localStorage defaults
          setSessions(localSessions);
        }
        
        setIsLoading(false);
      } catch (error) {
        logger.error("Error loading study sessions from database", { error });
        
        // STEP 4: Fallback to localStorage if database fails (offline mode)
        if (isMounted) {
          setSessions(localSessions);
          setIsLoading(false);
        }
      }
    };
    
    loadFromDatabase();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeProfile?.id]); // Only depend on IDs, not full objects

  // Add study session (optimistic update with revert on error)
  const addSession = useCallback(
    async (session: StudySession) => {
      // STEP 1: Optimistic update (immediate UI)
      const previousSessions = sessions;
      const updatedSessions = [session, ...sessions].slice(0, 100); // Keep last 100
      setSessions(updatedSessions);
      setLocalSessions(updatedSessions);

      // STEP 2: Save to database (in background)
      if (user) {
        try {
          await saveStudySession(user.id, session, activeProfile?.id || null);
        } catch (error) {
          logger.error("Error saving study session to database", { error });
          // STEP 3: Revert on error
          setSessions(previousSessions);
          setLocalSessions(previousSessions);
        }
      }
    },
    [sessions, user, activeProfile?.id, setLocalSessions]
  );

  // Update study session (optimistic update with revert on error)
  const updateSession = useCallback(
    async (sessionId: string, updates: Partial<StudySession>) => {
      // STEP 1: Optimistic update (immediate UI)
      const previousSessions = sessions;
      const updatedSessions = sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      );
      setSessions(updatedSessions);
      setLocalSessions(updatedSessions);

      // STEP 2: Save to database (in background)
      if (user) {
        try {
          // Find the session and save it
          const session = updatedSessions.find((s) => s.id === sessionId);
          if (session) {
            await saveStudySession(user.id, session, activeProfile?.id || null);
          }
        } catch (error) {
          logger.error("Error updating study session in database", { error });
          // STEP 3: Revert on error
          setSessions(previousSessions);
          setLocalSessions(previousSessions);
        }
      }
    },
    [sessions, user, activeProfile?.id, setLocalSessions]
  );

  return {
    sessions,
    addSession,
    updateSession,
    isLoading,
  };
}

