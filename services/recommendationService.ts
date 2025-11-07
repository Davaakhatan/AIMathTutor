/**
 * Recommendation Service
 * Provides subject recommendations based on goal completion and learning history
 * Critical for churn reduction (52% churn when goal achieved)
 */

import { getSummaries } from "@/services/conversationSummaryService";
import { getGoals } from "@/services/goalService";
import { logger } from "@/lib/logger";

export interface SubjectRecommendation {
  subject: string;
  reason: string;
  priority: "high" | "medium" | "low";
  relatedConcepts?: string[];
}

/**
 * Subject relationship map
 * Defines which subjects are related to each other
 */
const SUBJECT_RELATIONSHIPS: Record<string, string[]> = {
  // Exam prep → Related subjects
  SAT: ["College Essays", "AP Prep", "Study Skills", "Test Taking Strategies"],
  ACT: ["College Essays", "AP Prep", "Study Skills"],
  AP_Calculus: ["AP Physics", "AP Statistics", "College Math"],
  AP_Statistics: ["AP Calculus", "Data Science", "Probability"],
  
  // Subject mastery → Related subjects
  Algebra: ["Geometry", "Trigonometry", "Pre-Calculus"],
  Geometry: ["Algebra", "Trigonometry", "Pre-Calculus"],
  Trigonometry: ["Pre-Calculus", "Calculus", "Physics"],
  Pre_Calculus: ["Calculus", "AP Calculus", "Trigonometry"],
  Calculus: ["AP Calculus", "Physics", "Statistics"],
  
  // Science subjects
  Chemistry: ["Physics", "Biology", "AP Chemistry"],
  Physics: ["Calculus", "AP Physics", "Chemistry"],
  Biology: ["Chemistry", "AP Biology"],
  
  // General categories
  Arithmetic: ["Algebra", "Number Theory"],
  Number_Theory: ["Algebra", "Discrete Math"],
  Probability: ["Statistics", "AP Statistics"],
  Statistics: ["AP Statistics", "Data Science"],
};

/**
 * Get subject recommendations after goal completion
 * This is critical for churn reduction - suggests next learning path
 */
export async function getSubjectRecommendations(
  userId: string,
  profileId: string | null,
  completedGoalSubject: string,
  completedGoalType: string
): Promise<SubjectRecommendation[]> {
  try {
    const recommendations: SubjectRecommendation[] = [];

    // 1. Get related subjects from relationship map
    const normalizedSubject = completedGoalSubject
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const relatedSubjects = SUBJECT_RELATIONSHIPS[normalizedSubject] || [];

    // 2. Get user's learning history
    const summaries = await getSummaries(userId, profileId, 20);
    const existingGoals = await getGoals(userId, profileId);

    // Extract subjects already covered
    const coveredSubjects = new Set<string>();
    summaries.forEach((summary) => {
      summary.concepts_covered.forEach((concept) => {
        coveredSubjects.add(concept.toLowerCase());
      });
      summary.problem_types.forEach((type) => {
        coveredSubjects.add(type.toLowerCase());
      });
    });

    existingGoals.forEach((goal) => {
      coveredSubjects.add(goal.target_subject.toLowerCase());
    });

    // 3. Filter out already covered subjects and create recommendations
    for (const subject of relatedSubjects) {
      const subjectLower = subject.toLowerCase();
      
      // Skip if already covered
      if (coveredSubjects.has(subjectLower)) {
        continue;
      }

      // Determine priority based on goal type
      let priority: "high" | "medium" | "low" = "medium";
      let reason = "";

      if (completedGoalType === "exam_prep") {
        // Exam prep → high priority for related exam prep
        if (subject.includes("AP") || subject.includes("SAT") || subject.includes("ACT")) {
          priority = "high";
          reason = `Since you completed ${completedGoalSubject}, you're ready for ${subject}`;
        } else {
          priority = "medium";
          reason = `${subject} will help strengthen your foundation for ${completedGoalSubject}`;
        }
      } else if (completedGoalType === "subject_mastery") {
        // Subject mastery → high priority for next level
        if (subject.includes("AP") || subject.includes("Advanced")) {
          priority = "high";
          reason = `Ready to advance? ${subject} is the next level after ${completedGoalSubject}`;
        } else {
          priority = "medium";
          reason = `${subject} complements what you learned in ${completedGoalSubject}`;
        }
      } else {
        priority = "medium";
        reason = `${subject} is a natural next step after ${completedGoalSubject}`;
      }

      recommendations.push({
        subject,
        reason,
        priority,
        relatedConcepts: [completedGoalSubject],
      });
    }

    // 4. If no recommendations from relationship map, suggest common next steps
    if (recommendations.length === 0) {
      const commonNextSteps = getCommonNextSteps(completedGoalSubject, completedGoalType);
      recommendations.push(...commonNextSteps);
    }

    // Sort by priority (high first)
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Limit to top 5 recommendations
    return recommendations.slice(0, 5);
  } catch (error) {
    logger.error("Error in getSubjectRecommendations", { error, userId, completedGoalSubject });
    return [];
  }
}

/**
 * Get common next steps when no specific relationship exists
 */
function getCommonNextSteps(
  completedSubject: string,
  goalType: string
): SubjectRecommendation[] {
  const recommendations: SubjectRecommendation[] = [];

  if (goalType === "exam_prep") {
    // After exam prep, suggest related skills
    recommendations.push({
      subject: "Study Skills",
      reason: "Improve your study techniques for better results",
      priority: "medium",
    });
    recommendations.push({
      subject: "Time Management",
      reason: "Learn to manage your time effectively during exams",
      priority: "medium",
    });
  } else if (goalType === "subject_mastery") {
    // After subject mastery, suggest advanced topics
    if (completedSubject.toLowerCase().includes("algebra")) {
      recommendations.push({
        subject: "Geometry",
        reason: "Geometry builds on algebraic concepts you've mastered",
        priority: "high",
      });
    } else if (completedSubject.toLowerCase().includes("geometry")) {
      recommendations.push({
        subject: "Trigonometry",
        reason: "Trigonometry combines algebra and geometry",
        priority: "high",
      });
    }
  }

  return recommendations;
}

/**
 * Get recommendations based on learning history
 * Suggests subjects based on what user has been learning
 */
export async function getRecommendationsFromHistory(
  userId: string,
  profileId: string | null
): Promise<SubjectRecommendation[]> {
  try {
    const summaries = await getSummaries(userId, profileId, 10);
    const goals = await getGoals(userId, profileId, "active");

    if (summaries.length === 0 && goals.length === 0) {
      // New user - suggest popular starting points
      return [
        {
          subject: "Algebra",
          reason: "A great starting point for building math skills",
          priority: "high",
        },
        {
          subject: "Geometry",
          reason: "Visual and practical math concepts",
          priority: "medium",
        },
      ];
    }

    // Find most common concepts
    const conceptCounts: Record<string, number> = {};
    summaries.forEach((summary) => {
      summary.concepts_covered.forEach((concept) => {
        conceptCounts[concept] = (conceptCounts[concept] || 0) + 1;
      });
    });

    // Get top concepts
    const topConcepts = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([concept]) => concept);

    // Generate recommendations based on top concepts
    const recommendations: SubjectRecommendation[] = [];
    for (const concept of topConcepts) {
      const related = SUBJECT_RELATIONSHIPS[concept.toLowerCase().replace(/\s+/g, "_")] || [];
      for (const subject of related.slice(0, 2)) {
        recommendations.push({
          subject,
          reason: `You've been working on ${concept}, try ${subject} next`,
          priority: "medium",
        });
      }
    }

    return recommendations.slice(0, 5);
  } catch (error) {
    logger.error("Error in getRecommendationsFromHistory", { error, userId });
    return [];
  }
}

