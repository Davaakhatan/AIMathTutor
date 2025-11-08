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

  // Load study sessions - show localStorage immediately, then sync from database
  useEffect(() => {
    let isMounted = true;
    
    // STEP 1: Load from localStorage IMMEDIATELY (no loading state)
    setSessions(localSessions);
    setIsLoading(false); // Show data immediately
    
    // STEP 2: Sync from database in background (only for logged-in users)
    if (user) {
      const syncFromDatabase = async () => {
        try {
          const data = await getStudySessions(user.id, 100, activeProfile?.id || null);
          
          if (isMounted) {
            if (data && data.length > 0) {
              setSessions(data);
              // Sync to localStorage as cache
              setLocalSessions(data);
            }
            // If no data in DB, keep localStorage data (already set above)
          }
        } catch (error) {
          logger.error("Error syncing study sessions from database", { error });
          // Don't update state on error - keep localStorage data
        }
      };
      
      // Sync in background (don't block UI)
      syncFromDatabase();
    }
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeProfile?.id]); // Only depend on IDs, not full objects

  // Add study session
  const addSession = useCallback(
    async (session: StudySession) => {
      const updatedSessions = [session, ...sessions].slice(0, 100); // Keep last 100
      setSessions(updatedSessions);
      setLocalSessions(updatedSessions);

      // Save to database if logged in
      if (user) {
        try {
          await saveStudySession(user.id, session, activeProfile?.id || null);
        } catch (error) {
          logger.error("Error saving study session to database", { error });
          // Revert on error
          setSessions(sessions);
          setLocalSessions(localSessions);
        }
      }
    },
    [sessions, user, activeProfile?.id, setLocalSessions, localSessions]
  );

  // Update study session
  const updateSession = useCallback(
    async (sessionId: string, updates: Partial<StudySession>) => {
      const updatedSessions = sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      );
      setSessions(updatedSessions);
      setLocalSessions(updatedSessions);

      // Save to database if logged in
      if (user) {
        try {
          // Find the session and save it
          const session = updatedSessions.find((s) => s.id === sessionId);
          if (session) {
            await saveStudySession(user.id, session, activeProfile?.id || null);
          }
        } catch (error) {
          logger.error("Error updating study session in database", { error });
          // Revert on error
          setSessions(sessions);
          setLocalSessions(localSessions);
        }
      }
    },
    [sessions, user, activeProfile?.id, setLocalSessions, localSessions]
  );

  return {
    sessions,
    addSession,
    updateSession,
    isLoading,
  };
}

