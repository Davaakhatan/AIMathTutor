/**
 * Hook for fetching re-engagement nudges
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Nudge {
  id: string;
  type: "streak_at_risk" | "comeback" | "milestone_close" | "skill_decay" | "daily_goal" | "achievement_progress";
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
  action?: {
    label: string;
    type: "practice" | "challenge" | "review";
    data?: Record<string, unknown>;
  };
}

export function useNudges() {
  const { user, activeProfile, userRole } = useAuth();
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNudges = useCallback(async () => {
    if (!user) {
      setNudges([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profileId = userRole === "student" ? null : (activeProfile?.id || null);
      const params = new URLSearchParams({ userId: user.id });

      if (profileId) {
        params.append("profileId", profileId);
      }

      const response = await fetch(`/api/v2/nudges?${params}`);
      const result = await response.json();

      if (result.success) {
        setNudges(result.data);
      } else {
        setError(result.error || "Failed to fetch nudges");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [user, activeProfile?.id, userRole]);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  const dismissNudge = useCallback((nudgeId: string) => {
    setNudges(prev => prev.filter(n => n.id !== nudgeId));
  }, []);

  return {
    nudges,
    isLoading,
    error,
    refreshNudges: fetchNudges,
    dismissNudge,
  };
}
