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

  // Load daily goals - Database-first pattern with localStorage fallback
  useEffect(() => {
    let isMounted = true;
    
    if (!user) {
      // Guest mode - use localStorage only
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
      setIsLoading(false);
      return;
    }

    // For logged-in users: Database-first pattern
    const loadFromDatabase = async () => {
      setIsLoading(true);
      
      try {
        // STEP 1: Load from database (source of truth)
        const data = await getDailyGoals(user.id, 30, activeProfile?.id || null);
        
        if (!isMounted) return;
        
        if (data && data.length > 0) {
          // STEP 2: Update state with database data
          setGoals(data);
          
          // STEP 3: Cache latest goal to localStorage
          const latest = data[0];
          setLocalGoal({
            problems: latest.problems_goal || 5,
            time: latest.time_goal || 30,
            date: latest.date,
          });
        } else {
          // No data in database, use localStorage defaults
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
        }
        
        setIsLoading(false);
      } catch (error) {
        logger.error("Error loading daily goals from database", { error });
        
        // STEP 4: Fallback to localStorage if database fails (offline mode)
        if (isMounted) {
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

  // Update daily goal (optimistic update with revert on error)
  const updateGoal = useCallback(
    async (goal: DailyGoal) => {
      // STEP 1: Optimistic update (immediate UI)
      const previousGoals = goals;
      const updatedGoals = [...goals];
      const index = updatedGoals.findIndex((g) => g.date === goal.date);
      if (index >= 0) {
        updatedGoals[index] = goal;
      } else {
        updatedGoals.unshift(goal);
      }
      setGoals(updatedGoals);

      // Update localStorage cache
      setLocalGoal({
        problems: goal.problems_goal,
        time: goal.time_goal,
        date: goal.date,
      });

      // STEP 2: Save to database (in background)
      if (user) {
        try {
          await saveDailyGoal(user.id, goal, activeProfile?.id || null);
        } catch (error) {
          logger.error("Error updating daily goal in database", { error });
          // STEP 3: Revert on error
          setGoals(previousGoals);
          // Revert localStorage too
          const previousGoal = previousGoals.find((g) => g.date === goal.date);
          if (previousGoal) {
            setLocalGoal({
              problems: previousGoal.problems_goal,
              time: previousGoal.time_goal,
              date: previousGoal.date,
            });
          }
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

