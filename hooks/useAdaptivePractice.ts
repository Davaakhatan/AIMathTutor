/**
 * Hook for adaptive practice functionality
 * Generates personalized problem sessions based on user performance
 */

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface AdaptiveProblem {
  subject: string;
  difficulty: "elementary" | "middle" | "high" | "advanced";
  reason: string;
  priority: "high" | "medium" | "low";
  estimatedXP: number;
  focusArea?: string;
}

export interface AdaptivePracticeSession {
  userId: string;
  profileId?: string | null;
  problems: AdaptiveProblem[];
  sessionType: "weakness" | "strength" | "balanced" | "challenge";
  estimatedDuration: number;
  totalEstimatedXP: number;
}

export interface PerformanceAnalysis {
  weakAreas: { subject: string; successRate: number; attempts: number }[];
  strongAreas: { subject: string; successRate: number; attempts: number }[];
  recommendedDifficulty: "elementary" | "middle" | "high" | "advanced";
  overallMastery: number;
  suggestedFocus: string;
}

export function useAdaptivePractice() {
  const { user } = useAuth();
  const [session, setSession] = useState<AdaptivePracticeSession | null>(null);
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSession = useCallback(
    async (
      sessionType: "weakness" | "strength" | "balanced" | "challenge" = "balanced",
      problemCount: number = 5,
      profileId?: string | null
    ) => {
      if (!user) {
        setError("Not authenticated");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          userId: user.id,
          sessionType,
          count: problemCount.toString(),
        });

        if (profileId) {
          params.append("profileId", profileId);
        }

        const response = await fetch(`/api/v2/adaptive-practice?${params}`);
        const result = await response.json();

        if (result.success) {
          setSession(result.data);
          return result.data as AdaptivePracticeSession;
        } else {
          setError(result.error || "Failed to generate session");
          return null;
        }
      } catch (err) {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const getAnalysis = useCallback(
    async (profileId?: string | null) => {
      if (!user) {
        setError("Not authenticated");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v2/adaptive-practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            profileId,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setAnalysis(result.data);
          return result.data as PerformanceAnalysis;
        } else {
          setError(result.error || "Failed to get analysis");
          return null;
        }
      } catch (err) {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  return {
    session,
    analysis,
    isLoading,
    error,
    generateSession,
    getAnalysis,
  };
}
