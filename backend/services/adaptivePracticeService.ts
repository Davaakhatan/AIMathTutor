/**
 * Adaptive Practice Service
 * Generates personalized problem assignments based on user performance
 * Combines difficulty tracking and subject recommendations for optimal learning
 */

import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";
import {
  DifficultyLevel,
  DifficultyTrackingData,
  getDefaultTrackingData,
  calculateRecommendedDifficulty,
  getDifficultyStats,
} from "@/services/difficultyTracker";

export interface AdaptiveProblem {
  subject: string;
  difficulty: DifficultyLevel;
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
  estimatedDuration: number; // in minutes
  totalEstimatedXP: number;
}

export interface PerformanceAnalysis {
  weakAreas: { subject: string; successRate: number; attempts: number }[];
  strongAreas: { subject: string; successRate: number; attempts: number }[];
  recommendedDifficulty: DifficultyLevel;
  overallMastery: number;
  suggestedFocus: string;
}

/**
 * Generate an adaptive practice session for a user
 */
export async function generateAdaptivePractice(
  userId: string,
  profileId?: string | null,
  sessionType: "weakness" | "strength" | "balanced" | "challenge" = "balanced",
  problemCount: number = 5
): Promise<AdaptivePracticeSession> {
  try {
    logger.info("Generating adaptive practice session", { userId, profileId, sessionType });

    const supabase = await getSupabaseClient();
    if (!supabase) {
      return getDefaultSession(userId, profileId, sessionType, problemCount);
    }

    // Get user's problem history
    let problemQuery = supabase
      .from("problems")
      .select("type, difficulty, solved_at, hints_used, attempts")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (profileId) {
      problemQuery = problemQuery.eq("student_profile_id", profileId);
    } else {
      problemQuery = problemQuery.is("student_profile_id", null);
    }

    const { data: problemHistory } = await problemQuery;

    // Get user's XP data for difficulty tracking
    let xpQuery = supabase
      .from("xp_data")
      .select("difficulty_tracking")
      .eq("user_id", userId)
      .single();

    if (profileId) {
      xpQuery = xpQuery.eq("student_profile_id", profileId);
    }

    const { data: xpData } = await xpQuery;

    // Analyze performance
    const analysis = analyzePerformance(problemHistory || [], xpData?.difficulty_tracking);

    // Generate problems based on session type
    const problems = generateProblems(analysis, sessionType, problemCount);

    const session: AdaptivePracticeSession = {
      userId,
      profileId,
      problems,
      sessionType,
      estimatedDuration: problemCount * 3, // ~3 minutes per problem
      totalEstimatedXP: problems.reduce((sum, p) => sum + p.estimatedXP, 0),
    };

    logger.info("Adaptive practice session generated", {
      userId,
      problemCount: problems.length,
      sessionType,
    });

    return session;
  } catch (error) {
    logger.error("Error generating adaptive practice", { error, userId });
    return getDefaultSession(userId, profileId, sessionType, problemCount);
  }
}

/**
 * Analyze user performance to identify weak and strong areas
 */
export function analyzePerformance(
  problemHistory: any[],
  difficultyTracking?: DifficultyTrackingData
): PerformanceAnalysis {
  // Group problems by subject
  const subjectStats = new Map<string, { solved: number; total: number; hints: number }>();

  for (const problem of problemHistory) {
    const subject = problem.type?.toLowerCase() || "general";
    const current = subjectStats.get(subject) || { solved: 0, total: 0, hints: 0 };

    current.total++;
    if (problem.solved_at) current.solved++;
    current.hints += problem.hints_used || 0;

    subjectStats.set(subject, current);
  }

  // Calculate success rates
  const subjectPerformance = Array.from(subjectStats.entries()).map(([subject, stats]) => ({
    subject,
    successRate: stats.total > 0 ? (stats.solved / stats.total) * 100 : 0,
    attempts: stats.total,
    avgHints: stats.total > 0 ? stats.hints / stats.total : 0,
  }));

  // Sort to find weak and strong areas
  const sorted = [...subjectPerformance].sort((a, b) => a.successRate - b.successRate);

  // Weak areas: lowest success rate with at least 2 attempts
  const weakAreas = sorted
    .filter(s => s.attempts >= 2 && s.successRate < 70)
    .slice(0, 3)
    .map(({ subject, successRate, attempts }) => ({ subject, successRate, attempts }));

  // Strong areas: highest success rate with at least 3 attempts
  const strongAreas = sorted
    .filter(s => s.attempts >= 3 && s.successRate >= 70)
    .reverse()
    .slice(0, 3)
    .map(({ subject, successRate, attempts }) => ({ subject, successRate, attempts }));

  // Get recommended difficulty
  const tracking = difficultyTracking || getDefaultTrackingData();
  const recommendedDifficulty = calculateRecommendedDifficulty(tracking);
  const stats = getDifficultyStats(tracking);

  // Calculate overall mastery
  const overallMastery = stats.overallSuccessRate;

  // Suggest focus based on analysis
  let suggestedFocus = "general practice";
  if (weakAreas.length > 0) {
    suggestedFocus = `${weakAreas[0].subject} - needs improvement (${Math.round(weakAreas[0].successRate)}% success)`;
  } else if (strongAreas.length > 0) {
    suggestedFocus = `${strongAreas[0].subject} - ready for challenge`;
  }

  return {
    weakAreas,
    strongAreas,
    recommendedDifficulty,
    overallMastery,
    suggestedFocus,
  };
}

/**
 * Generate problems based on performance analysis and session type
 */
function generateProblems(
  analysis: PerformanceAnalysis,
  sessionType: "weakness" | "strength" | "balanced" | "challenge",
  count: number
): AdaptiveProblem[] {
  const problems: AdaptiveProblem[] = [];
  const { weakAreas, strongAreas, recommendedDifficulty } = analysis;

  // XP calculation based on difficulty
  const xpByDifficulty: Record<DifficultyLevel, number> = {
    elementary: 9,
    middle: 15,
    high: 20,
    advanced: 27,
  };

  switch (sessionType) {
    case "weakness":
      // Focus on weak areas
      for (let i = 0; i < count; i++) {
        const weakArea = weakAreas[i % Math.max(weakAreas.length, 1)];
        const subject = weakArea?.subject || getDefaultSubject(i);
        const difficulty = weakArea ? lowerDifficulty(recommendedDifficulty) : recommendedDifficulty;

        problems.push({
          subject,
          difficulty,
          reason: weakArea
            ? `Improve ${subject} (${Math.round(weakArea.successRate)}% success rate)`
            : "Practice fundamentals",
          priority: "high",
          estimatedXP: xpByDifficulty[difficulty],
          focusArea: "improvement",
        });
      }
      break;

    case "strength":
      // Build on strengths with harder problems
      for (let i = 0; i < count; i++) {
        const strongArea = strongAreas[i % Math.max(strongAreas.length, 1)];
        const subject = strongArea?.subject || getDefaultSubject(i);
        const difficulty = raiseDifficulty(recommendedDifficulty);

        problems.push({
          subject,
          difficulty,
          reason: strongArea
            ? `Challenge yourself in ${subject}`
            : "Advance your skills",
          priority: "medium",
          estimatedXP: xpByDifficulty[difficulty],
          focusArea: "mastery",
        });
      }
      break;

    case "challenge":
      // All problems at higher difficulty
      const subjects = ["algebra", "geometry", "calculus", "trigonometry", "statistics"];
      for (let i = 0; i < count; i++) {
        const subject = subjects[i % subjects.length];
        const difficulty = raiseDifficulty(raiseDifficulty(recommendedDifficulty));

        problems.push({
          subject,
          difficulty,
          reason: "Push your limits",
          priority: "low",
          estimatedXP: xpByDifficulty[difficulty],
          focusArea: "challenge",
        });
      }
      break;

    case "balanced":
    default:
      // Mix of weak areas (40%), recommended (40%), and challenge (20%)
      const weakCount = Math.ceil(count * 0.4);
      const recommendedCount = Math.ceil(count * 0.4);
      const challengeCount = count - weakCount - recommendedCount;

      // Add weakness problems
      for (let i = 0; i < weakCount; i++) {
        const weakArea = weakAreas[i % Math.max(weakAreas.length, 1)];
        const subject = weakArea?.subject || getDefaultSubject(i);

        problems.push({
          subject,
          difficulty: recommendedDifficulty,
          reason: weakArea
            ? `Work on ${subject}`
            : "Build foundation",
          priority: "high",
          estimatedXP: xpByDifficulty[recommendedDifficulty],
          focusArea: "improvement",
        });
      }

      // Add recommended difficulty problems
      for (let i = 0; i < recommendedCount; i++) {
        const subject = strongAreas[i % Math.max(strongAreas.length, 1)]?.subject || getDefaultSubject(i + weakCount);

        problems.push({
          subject,
          difficulty: recommendedDifficulty,
          reason: "Maintain progress",
          priority: "medium",
          estimatedXP: xpByDifficulty[recommendedDifficulty],
          focusArea: "practice",
        });
      }

      // Add challenge problems
      for (let i = 0; i < challengeCount; i++) {
        const difficulty = raiseDifficulty(recommendedDifficulty);

        problems.push({
          subject: getDefaultSubject(i),
          difficulty,
          reason: "Stretch goal",
          priority: "low",
          estimatedXP: xpByDifficulty[difficulty],
          focusArea: "challenge",
        });
      }
      break;
  }

  return problems;
}

/**
 * Get next higher difficulty level
 */
function raiseDifficulty(current: DifficultyLevel): DifficultyLevel {
  const order: DifficultyLevel[] = ["elementary", "middle", "high", "advanced"];
  const index = order.indexOf(current);
  return order[Math.min(index + 1, order.length - 1)];
}

/**
 * Get next lower difficulty level
 */
function lowerDifficulty(current: DifficultyLevel): DifficultyLevel {
  const order: DifficultyLevel[] = ["elementary", "middle", "high", "advanced"];
  const index = order.indexOf(current);
  return order[Math.max(index - 1, 0)];
}

/**
 * Get default subject for filling gaps
 */
function getDefaultSubject(index: number): string {
  const subjects = ["algebra", "geometry", "arithmetic", "fractions", "equations"];
  return subjects[index % subjects.length];
}

/**
 * Generate default session for new users or errors
 */
function getDefaultSession(
  userId: string,
  profileId: string | null | undefined,
  sessionType: "weakness" | "strength" | "balanced" | "challenge",
  count: number
): AdaptivePracticeSession {
  const problems: AdaptiveProblem[] = [];
  const defaultSubjects = ["algebra", "geometry", "arithmetic", "fractions", "equations"];

  for (let i = 0; i < count; i++) {
    problems.push({
      subject: defaultSubjects[i % defaultSubjects.length],
      difficulty: "middle",
      reason: "Recommended for beginners",
      priority: "medium",
      estimatedXP: 15,
    });
  }

  return {
    userId,
    profileId,
    problems,
    sessionType,
    estimatedDuration: count * 3,
    totalEstimatedXP: count * 15,
  };
}

/**
 * Get performance analysis for a user
 */
export async function getUserPerformanceAnalysis(
  userId: string,
  profileId?: string | null
): Promise<PerformanceAnalysis> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return {
        weakAreas: [],
        strongAreas: [],
        recommendedDifficulty: "middle",
        overallMastery: 50,
        suggestedFocus: "Start practicing to build your profile",
      };
    }

    // Get problem history
    let problemQuery = supabase
      .from("problems")
      .select("type, difficulty, solved_at, hints_used, attempts")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (profileId) {
      problemQuery = problemQuery.eq("student_profile_id", profileId);
    } else {
      problemQuery = problemQuery.is("student_profile_id", null);
    }

    const { data: problemHistory } = await problemQuery;

    // Get difficulty tracking
    let xpQuery = supabase
      .from("xp_data")
      .select("difficulty_tracking")
      .eq("user_id", userId)
      .single();

    if (profileId) {
      xpQuery = xpQuery.eq("student_profile_id", profileId);
    }

    const { data: xpData } = await xpQuery;

    return analyzePerformance(problemHistory || [], xpData?.difficulty_tracking);
  } catch (error) {
    logger.error("Error getting performance analysis", { error, userId });
    return {
      weakAreas: [],
      strongAreas: [],
      recommendedDifficulty: "middle",
      overallMastery: 50,
      suggestedFocus: "Start practicing to build your profile",
    };
  }
}
