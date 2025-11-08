"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDailyGoals, saveDailyGoal, DailyGoal } from "@/services/supabaseDataService";
import { useLocalStorage } from "./useLocalStorage";
import { logger } from "@/lib/logger";

interface DailyGoalLocal {
  problems: number;
  time: number; // in minutes
  date: string; // YYYY-MM-DD
}

/**
 * Hook to manage daily goals with Supabase persistence
 * Falls back to localStorage for guest users
 */
export function useDailyGoals() {
  const { user, activeProfile } = useAuth();
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localGoal, setLocalGoal] = useLocalStorage<DailyGoalLocal>("aitutor-daily-goals", {
    problems: 5,
    time: 30,
    date: new Date().toISOString().split("T")[0],
  });

  // Load daily goals - show localStorage immediately, then sync from database
  useEffect(() => {
    let isMounted = true;
    
    // STEP 1: Load from localStorage IMMEDIATELY (no loading state)
    const currentLocalGoal = JSON.parse(
      localStorage.getItem("aitutor-daily-goals") || 
      JSON.stringify({ problems: 5, time: 30, date: new Date().toISOString().split("T")[0] })
    );
    
    const localGoals: DailyGoal[] = [
      {
        date: currentLocalGoal.date,
        problems_goal: currentLocalGoal.problems,
        time_goal: currentLocalGoal.time,
        problems_completed: 0,
        time_completed: 0,
      },
    ];
    
    setGoals(localGoals);
    setIsLoading(false); // Show data immediately
    
    // STEP 2: Sync from database in background (only for logged-in users)
    if (user) {
      const syncFromDatabase = async () => {
        try {
          const data = await getDailyGoals(user.id, 30, activeProfile?.id || null);
          
          if (isMounted) {
            if (data && data.length > 0) {
              setGoals(data);
              // Sync latest goal to localStorage as cache (only if different)
              const latest = data[0];
              if (latest.problems_goal !== currentLocalGoal.problems || 
                  latest.time_goal !== currentLocalGoal.time ||
                  latest.date !== currentLocalGoal.date) {
                setLocalGoal({
                  problems: latest.problems_goal || 5,
                  time: latest.time_goal || 30,
                  date: latest.date,
                });
              }
            }
            // If no data in DB, keep localStorage data (already set above)
          }
        } catch (error) {
          logger.error("Error syncing daily goals from database", { error });
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

  // Get today's goal - memoized to prevent infinite loops
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayGoal = useMemo(() => {
    const found = goals.find((g) => g.date === today);
    if (found) return found;
    // Read from localStorage directly to avoid dependency on localGoal state
    let fallbackGoal: DailyGoalLocal;
    try {
      const stored = localStorage.getItem("aitutor-daily-goals");
      fallbackGoal = stored ? JSON.parse(stored) : { problems: 5, time: 30, date: today };
    } catch {
      fallbackGoal = { problems: 5, time: 30, date: today };
    }
    return {
      date: today,
      problems_goal: fallbackGoal.problems,
      time_goal: fallbackGoal.time,
      problems_completed: 0,
      time_completed: 0,
    };
  }, [goals, today]); // Don't depend on localGoal to avoid loops

  // Update daily goal
  const updateGoal = useCallback(
    async (goal: DailyGoal) => {
      const updatedGoals = [...goals];
      const index = updatedGoals.findIndex((g) => g.date === goal.date);
      if (index >= 0) {
        updatedGoals[index] = goal;
      } else {
        updatedGoals.unshift(goal);
      }
      setGoals(updatedGoals);

      // Update localStorage
      setLocalGoal({
        problems: goal.problems_goal,
        time: goal.time_goal,
        date: goal.date,
      });

      // Save to database if logged in
      if (user) {
        try {
          await saveDailyGoal(user.id, goal, activeProfile?.id || null);
        } catch (error) {
          logger.error("Error updating daily goal in database", { error });
          // Revert on error
          setGoals(goals);
        }
      }
    },
    [goals, user, activeProfile?.id, setLocalGoal]
  );

  return {
    goals,
    todayGoal,
    updateGoal,
    isLoading,
  };
}

