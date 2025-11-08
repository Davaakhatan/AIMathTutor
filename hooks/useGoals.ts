"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { getActiveGoals, createGoal, type LearningGoal, type GoalType } from "@/services/goalSystem";
import eventBus from "@/lib/eventBus";

/**
 * Hook to manage learning goals
 */
export function useGoals() {
  const { user, activeProfile, userRole } = useAuth();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Load goals on mount or when user changes
  useEffect(() => {
    if (!user) {
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const loadGoals = async () => {
      try {
        setIsLoading(true);
        
        // For students, always use user-level (profileId = null)
        const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
        
        logger.info("Loading active goals", { userId: user.id, profileId: profileIdToUse, userRole });
        
        const activeGoals = await getActiveGoals(user.id, profileIdToUse);
        setGoals(activeGoals);
        
        logger.info("Goals loaded", { userId: user.id, goalCount: activeGoals.length });
      } catch (error) {
        logger.error("Error loading goals", { error, userId: user.id });
        setGoals([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, [user?.id, userRole]);

  // Listen for goal events
  useEffect(() => {
    if (!user) return;

    const unsubscribe = eventBus.on("goal_progress_updated", (event) => {
      // Reload goals when progress updates
      if (event.userId === user.id) {
        logger.debug("Goal progress updated event received, reloading goals");
        // Trigger reload by updating a state (will cause useEffect to re-run)
        setGoals(prev => [...prev]); // Force re-render
      }
    });

    const unsubscribe2 = eventBus.on("goal_completed", (event) => {
      // Reload goals when one completes
      if (event.userId === user.id) {
        logger.info("Goal completed event received", { goalId: event.data.goalId });
        // Reload to get updated status
        if (user) {
          const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
          getActiveGoals(user.id, profileIdToUse).then(setGoals);
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribe2();
    };
  }, [user?.id, userRole, activeProfile?.id]);

  // Create a new goal
  const createNewGoal = useCallback(async (
    goalType: GoalType,
    targetSubject: string,
    targetDate?: string,
    targetProblems?: number
  ) => {
    if (!user) {
      logger.warn("Cannot create goal - user not authenticated");
      return null;
    }

    try {
      setIsCreating(true);
      
      const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
      
      const goalId = await createGoal(user.id, {
        goalType,
        targetSubject,
        targetDate,
        targetProblems,
        profileId: profileIdToUse,
      });

      if (goalId) {
        // Reload goals to include new one
        const updatedGoals = await getActiveGoals(user.id, profileIdToUse);
        setGoals(updatedGoals);
        
        logger.info("Goal created successfully", { goalId, targetSubject });
      }

      return goalId;
    } catch (error) {
      logger.error("Error creating goal", { error, targetSubject });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [user, userRole, activeProfile?.id]);

  return {
    goals,
    isLoading,
    isCreating,
    createNewGoal,
  };
}

