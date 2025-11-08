/**
 * Subject Recommendation System
 * Suggests practice areas based on completed problems and goals
 * Part of Study Companion - helps reduce churn by keeping students engaged
 */

import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";

export interface SubjectRecommendation {
  subject: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  relatedTo?: string;
  estimatedProblems: number;
  difficulty?: string;
}

/**
 * Get subject recommendations for a user
 * Based on completed problems, current goals, and learning patterns
 */
export async function getSubjectRecommendations(
  userId: string,
  profileId?: string | null,
  limit: number = 3
): Promise<SubjectRecommendation[]> {
  try {
    logger.info("Generating subject recommendations", { userId, profileId });

    const supabase = await getSupabaseClient();
    if (!supabase) {
      return getDefaultRecommendations();
    }

    // Get user's recent problems
    let problemQuery = supabase
      .from("problems")
      .select("type, difficulty, solved_at")
      .eq("user_id", userId)
      .not("solved_at", "is", null)
      .order("solved_at", { ascending: false })
      .limit(20);

    if (profileId) {
      problemQuery = problemQuery.eq("student_profile_id", profileId);
    } else {
      problemQuery = problemQuery.is("student_profile_id", null);
    }

    const { data: recentProblems } = await problemQuery;

    // Get user's active goals
    let goalQuery = supabase
      .from("learning_goals")
      .select("target_subject, progress, goal_type")
      .eq("user_id", userId)
      .eq("status", "active");

    if (profileId) {
      goalQuery = goalQuery.eq("student_profile_id", profileId);
    } else {
      goalQuery = goalQuery.is("student_profile_id", null);
    }

    const { data: activeGoals } = await goalQuery;

    // Generate recommendations
    const recommendations = generateRecommendations(
      recentProblems || [],
      activeGoals || []
    );

    logger.info("Recommendations generated", { userId, count: recommendations.length });
    return recommendations.slice(0, limit);
  } catch (error) {
    logger.error("Error generating recommendations", { error, userId });
    return getDefaultRecommendations();
  }
}

/**
 * Generate recommendations based on data
 */
function generateRecommendations(
  recentProblems: any[],
  activeGoals: any[]
): SubjectRecommendation[] {
  const recommendations: SubjectRecommendation[] = [];

  // 1. Recommend based on active goals that need progress
  for (const goal of activeGoals) {
    if (goal.progress < 100) {
      recommendations.push({
        subject: goal.target_subject,
        reason: `Continue working on your ${goal.goal_type.replace("_", " ")} goal`,
        confidence: "high",
        estimatedProblems: Math.ceil((100 - goal.progress) / 10),
        relatedTo: goal.target_subject,
      });
    }
  }

  // 2. Recommend related subjects based on what they've been solving
  const problemTypes = recentProblems.map(p => p.type);
  const mostCommonType = getMostCommon(problemTypes);

  if (mostCommonType) {
    const relatedSubjects = getRelatedSubjects(mostCommonType);
    for (const subject of relatedSubjects) {
      if (!recommendations.some(r => r.subject === subject)) {
        recommendations.push({
          subject,
          reason: `Related to your recent ${mostCommonType} practice`,
          confidence: "medium",
          estimatedProblems: 5,
          relatedTo: mostCommonType,
        });
      }
    }
  }

  // 3. Recommend progression (harder difficulty)
  const recentDifficulty = recentProblems[0]?.difficulty;
  if (recentDifficulty && recentProblems.length >= 5) {
    const nextDifficulty = getNextDifficulty(recentDifficulty);
    if (nextDifficulty && mostCommonType) {
      recommendations.push({
        subject: mostCommonType,
        reason: `Challenge yourself with ${nextDifficulty} level problems`,
        confidence: "medium",
        estimatedProblems: 3,
        difficulty: nextDifficulty,
      });
    }
  }

  // 4. Fill with popular subjects if needed
  if (recommendations.length < 3) {
    const popularSubjects = ["algebra", "geometry", "calculus", "statistics"];
    for (const subject of popularSubjects) {
      if (!recommendations.some(r => r.subject.toLowerCase() === subject)) {
        recommendations.push({
          subject,
          reason: "Popular practice area",
          confidence: "low",
          estimatedProblems: 5,
        });
        if (recommendations.length >= 3) break;
      }
    }
  }

  return recommendations;
}

/**
 * Get related subjects
 */
function getRelatedSubjects(subject: string): string[] {
  const relations: Record<string, string[]> = {
    "algebra": ["equations", "polynomials", "functions"],
    "geometry": ["trigonometry", "coordinate geometry", "3D shapes"],
    "calculus": ["derivatives", "integrals", "limits"],
    "arithmetic": ["fractions", "decimals", "percentages"],
    "trigonometry": ["angles", "triangles", "unit circle"],
  };

  const subjectLower = subject.toLowerCase();
  for (const [key, related] of Object.entries(relations)) {
    if (subjectLower.includes(key)) {
      return related;
    }
  }

  return [];
}

/**
 * Get next difficulty level
 */
function getNextDifficulty(current: string): string | null {
  const progression = ["elementary", "middle", "high", "advanced"];
  const currentIndex = progression.indexOf(current);
  if (currentIndex >= 0 && currentIndex < progression.length - 1) {
    return progression[currentIndex + 1];
  }
  return null;
}

/**
 * Get most common item in array
 */
function getMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon: T | null = null;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  }

  return mostCommon;
}

/**
 * Default recommendations for new users
 */
function getDefaultRecommendations(): SubjectRecommendation[] {
  return [
    {
      subject: "Algebra",
      reason: "Great starting point for most students",
      confidence: "medium",
      estimatedProblems: 10,
    },
    {
      subject: "Geometry",
      reason: "Build spatial reasoning skills",
      confidence: "medium",
      estimatedProblems: 10,
    },
    {
      subject: "Arithmetic",
      reason: "Strengthen fundamental skills",
      confidence: "medium",
      estimatedProblems: 10,
    },
  ];
}

