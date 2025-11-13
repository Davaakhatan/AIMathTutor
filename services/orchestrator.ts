/**
 * Ecosystem Orchestrator
 * Coordinates actions across Tutoring, Growth, and Companion systems
 * Responds to events and triggers multi-system workflows
 */

import { logger } from "@/lib/logger";
import eventBus, { type EcosystemEvent } from "@/lib/eventBus";
import { updateXPData, getXPData } from "./supabaseDataService";
import { updateStreakData, getStreakData } from "./supabaseDataService";
import { generateConversationSummary, saveConversationSummary } from "./conversationMemory";
import { checkGoalsForProblem } from "./goalSystem";
import { getSubjectRecommendations } from "./recommendationSystem";
import { generateBeatMySkillChallenge } from "./challengeGenerator";
import type { Message } from "@/types";

/**
 * Handle problem completion
 * Triggers: XP update, streak update, achievement check, challenge creation, share generation
 */
export async function onProblemCompleted(
  userId: string,
  problemData: {
    problemText: string;
    problemType: string;
    difficulty?: string;
    hintsUsed?: number;
    timeSpent?: number;
    profileId?: string | null;
  }
): Promise<void> {
  try {
    logger.info("Orchestrating problem completion", { userId, problemType: problemData.problemType });

    const profileId = problemData.profileId || null;

    // 1. Update XP (re-enabled because XPSystem detection is unreliable)
    try {
      // First, check if problem is already solved in database (to prevent duplicate XP)
      const { getProblems } = await import("@/services/supabaseDataService");
      const problems = await getProblems(userId, 100, profileId);
      
      // Try to find the problem
      let matchingProblem = problems.find(p => 
        p.text === problemData.problemText || 
        p.text.trim() === problemData.problemText.trim()
      );
      
      // If no exact match, try fuzzy match (first 50 characters)
      if (!matchingProblem) {
        const problemTextStart = problemData.problemText.substring(0, 50).trim();
        matchingProblem = problems.find(p => 
          p.text.substring(0, 50).trim() === problemTextStart
        );
      }
      
      // If still no match, try finding the most recent unsolved problem
      if (!matchingProblem) {
        const unsolvedProblems = problems
          .filter(p => !p.solved_at)
          .sort((a, b) => {
            const aTime = new Date(a.created_at || 0).getTime();
            const bTime = new Date(b.created_at || 0).getTime();
            return bTime - aTime; // Most recent first
          });
        matchingProblem = unsolvedProblems[0];
      }
      
      // If problem is already solved, skip XP award (already awarded)
      if (matchingProblem?.solved_at) {
        logger.debug("Problem already solved - skipping XP award", {
          userId,
          problemId: matchingProblem.id,
          solvedAt: matchingProblem.solved_at
        });
      } else {
        // Problem not solved yet - award XP
        const currentXP = await getXPData(userId, profileId);
        if (currentXP) {
          const xpGained = calculateXPForProblem(problemData.difficulty, problemData.hintsUsed);
          const newTotalXP = currentXP.total_xp + xpGained;
          const newLevel = calculateLevel(newTotalXP);
          const xpToNextLevel = calculateXPForLevel(newLevel + 1) - newTotalXP;

          // Update XP history - always add a new entry for problem completion
          const today = new Date().toISOString().split("T")[0];
          const updatedHistory = [
            ...(currentXP.xp_history || []),
            {
              date: today,
              xp: xpGained,
              reason: `Solved ${problemData.problemType} problem`,
            },
          ];

          await updateXPData(userId, {
            total_xp: newTotalXP,
            level: newLevel,
            xp_to_next_level: xpToNextLevel,
            xp_history: updatedHistory,
          }, profileId);

          logger.info("XP updated for problem completion", { userId, xpGained, newLevel, newTotalXP });
        } else {
          logger.warn("No XP data found for user - cannot award XP", { userId, profileId });
        }
      }
    } catch (error) {
      logger.error("Error updating XP for problem completion", { error, userId, errorMessage: error instanceof Error ? error.message : String(error) });
      // Don't fail the whole orchestration if this fails
    }

    // 2. Update Streak
    try {
      // Always try to update streak - getStreakData will handle Supabase availability
      const today = new Date().toISOString().split("T")[0];
      let currentStreak = await getStreakData(userId, profileId);
      
      // If no streak exists, create default (getStreakData should create it, but ensure it exists)
      if (!currentStreak) {
        const { createDefaultStreakData } = await import("@/services/supabaseDataService");
        currentStreak = await createDefaultStreakData(userId, profileId);
        logger.info("Created default streak data for problem completion", { userId });
      }
      
      if (currentStreak) {
        const lastStudyDate = currentStreak.last_study_date;
        const shouldIncrementStreak = !lastStudyDate || lastStudyDate !== today;

        if (shouldIncrementStreak) {
          const newStreak = (currentStreak.current_streak || 0) + 1;
          await updateStreakData(userId, {
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, currentStreak.longest_streak || 0),
            last_study_date: today,
          }, profileId);

          logger.info("Streak updated for problem completion", { userId, newStreak });
          
          // Dispatch event to refresh UI
          window.dispatchEvent(new CustomEvent("streak_updated"));
        } else {
          logger.debug("Streak already updated today", { userId, lastStudyDate });
        }
      }
    } catch (error) {
      logger.error("Error updating streak for problem completion", { error, userId, errorMessage: error instanceof Error ? error.message : String(error) });
      // Don't fail the whole orchestration if this fails
    }

    // 3. Mark problem as solved in database (update solved_at)
    // Note: We already fetched problems in step 1, but we'll fetch again here to ensure we have the latest state
    try {
      // Always try to mark problem as solved - updateProblem will handle Supabase availability
      const { updateProblem, getProblems } = await import("@/services/supabaseDataService");
      // Find the problem by text and user_id to update it
      const problems = await getProblems(userId, 100, profileId);
      
      // Try exact match first
      let matchingProblem = problems.find(p => 
        p.text === problemData.problemText || 
        p.text.trim() === problemData.problemText.trim()
      );
      
      // If no exact match, try fuzzy match (first 50 characters)
      if (!matchingProblem) {
        const problemTextStart = problemData.problemText.substring(0, 50).trim();
        matchingProblem = problems.find(p => 
          p.text.substring(0, 50).trim() === problemTextStart
        );
      }
      
      // If still no match, try finding the most recent unsolved problem
      if (!matchingProblem) {
        const unsolvedProblems = problems
          .filter(p => !p.solved_at)
          .sort((a, b) => {
            // Use created_at from the database result (it's included in getProblems)
            const aTime = new Date(a.created_at || 0).getTime();
            const bTime = new Date(b.created_at || 0).getTime();
            return bTime - aTime; // Most recent first
          });
        matchingProblem = unsolvedProblems[0]; // Use most recent unsolved problem
        logger.debug("Using most recent unsolved problem as fallback", {
          userId,
          problemId: matchingProblem?.id,
          problemText: problemData.problemText.substring(0, 50)
        });
      }
      
      if (matchingProblem && matchingProblem.id) {
        // Check if already solved
        if (matchingProblem.solved_at) {
          logger.debug("Problem already marked as solved", {
            userId,
            problemId: matchingProblem.id,
            solvedAt: matchingProblem.solved_at
          });
        } else {
          // Update the problem to mark it as solved
          await updateProblem(userId, matchingProblem.id, {
            solved_at: new Date().toISOString(),
          });
          logger.info("Problem marked as solved in database", { 
            userId, 
            problemId: matchingProblem.id,
            problemText: problemData.problemText.substring(0, 50)
          });
        }
      } else {
        logger.warn("Problem not found in database to mark as solved", { 
          userId, 
          problemText: problemData.problemText.substring(0, 50),
          problemsCount: problems.length,
          allProblemTexts: problems.map(p => p.text.substring(0, 30))
        });
      }
    } catch (error) {
      logger.error("Error marking problem as solved", { error, userId, errorMessage: error instanceof Error ? error.message : String(error) });
      // Don't fail the whole orchestration if this fails
    }

    // 4. NOTE: Do NOT emit "problem_completed" event here - that would cause infinite recursion!
    // The orchestrator is already listening to "problem_completed" events, so emitting here
    // would cause this function to be called again, creating an infinite loop.
    // Other systems should listen to the original event emission (from ProblemProgress, etc.)

    // 5. Check and update goals (Week 2) - IMPLEMENTED
    await checkGoalsForProblem(userId, problemData.problemType, profileId);

    // 6. Auto-generate "Beat My Skill" challenge (Week 3) - IMPLEMENTED
    const challenge = await generateBeatMySkillChallenge(userId, problemData);
    if (challenge) {
      logger.info("Auto-challenge generated after problem completion", { 
        userId, 
        challengeId: challenge.id,
        shareCode: challenge.share_code
      });
    }

    // 7. Update conversation summary (Week 2)
    // TODO: Pass messages array from problem completion event
    // Will be implemented when session management is integrated

    // 8. TODO: Create additional share links (Week 3 - advanced)
    // The challenge above already has a share_code for viral sharing

    logger.info("Problem completion orchestrated successfully", { userId });
  } catch (error) {
    logger.error("Error orchestrating problem completion", { 
      error,
      message: error instanceof Error ? error.message : String(error),
      userId 
    });
  }
}

/**
 * Handle achievement unlock
 * Triggers: Share generation, notification
 */
export async function onAchievementUnlocked(
  userId: string,
  achievementData: {
    achievementId: string;
    achievementName: string;
    profileId?: string | null;
  }
): Promise<void> {
  try {
    logger.info("Orchestrating achievement unlock", { userId, achievementId: achievementData.achievementId });

    // Emit event
    await eventBus.emit("achievement_unlocked", userId, achievementData, { 
      profileId: achievementData.profileId 
    });

    // TODO: Auto-generate share card (Week 3)
    // TODO: Send notification (Week 3)

    logger.info("Achievement unlock orchestrated successfully", { userId });
  } catch (error) {
    logger.error("Error orchestrating achievement unlock", { error, userId });
  }
}

/**
 * Handle goal completion
 * Triggers: Subject recommendation, share generation, practice assignment
 */
export async function onGoalCompleted(
  userId: string,
  goalData: {
    goalId: string;
    goalType: string;
    targetSubject: string;
    profileId?: string | null;
  }
): Promise<void> {
  try {
    logger.info("Orchestrating goal completion", { userId, goalId: goalData.goalId });

    // Emit event
    await eventBus.emit("goal_completed", userId, goalData, { 
      profileId: goalData.profileId 
    });

    // 1. Get subject recommendations (Week 2) - IMPLEMENTED
    const recommendations = await getSubjectRecommendations(userId, goalData.profileId, 3);
    logger.info("Recommendations generated for goal completion", { 
      userId, 
      recommendationCount: recommendations.length,
      subjects: recommendations.map(r => r.subject)
    });

    // 2. TODO: Generate share card (Week 3)
    // 3. TODO: Create practice assignment (advanced feature)

    logger.info("Goal completion orchestrated successfully", { userId, recommendations: recommendations.length });
  } catch (error) {
    logger.error("Error orchestrating goal completion", { error, userId });
  }
}

/**
 * Calculate XP for problem based on difficulty and hints
 */
function calculateXPForProblem(difficulty?: string, hintsUsed?: number): number {
  let baseXP = 10;

  // Adjust for difficulty
  switch (difficulty) {
    case "elementary":
      baseXP = 5;
      break;
    case "middle":
      baseXP = 10;
      break;
    case "high":
      baseXP = 15;
      break;
    case "advanced":
      baseXP = 20;
      break;
    default:
      baseXP = 10;
  }

  // Reduce XP for hints used
  const hintPenalty = (hintsUsed || 0) * 2;
  const finalXP = Math.max(5, baseXP - hintPenalty); // Minimum 5 XP

  return finalXP;
}

/**
 * Calculate level from total XP
 */
function calculateLevel(totalXP: number): number {
  // Level formula: Each level requires more XP
  // Level 1: 0-100 XP
  // Level 2: 100-250 XP (+150)
  // Level 3: 250-450 XP (+200)
  // etc.
  
  let level = 1;
  let xpRequired = 100;
  let xpAccumulated = 0;

  while (xpAccumulated + xpRequired <= totalXP) {
    xpAccumulated += xpRequired;
    level++;
    xpRequired = Math.round(100 * (level - 1) * 1.5 + 100);
  }

  return level;
}

/**
 * Calculate XP needed for a specific level
 */
function calculateXPForLevel(level: number): number {
  // Level 1: 100, Level 2: 250, Level 3: 450, etc.
  // Formula: base * (level - 1) * 1.5 + base
  return Math.round(100 * (level - 1) * 1.5 + 100);
}

// Track if orchestrator is already initialized to prevent duplicate listeners
let isInitialized = false;

/**
 * Initialize orchestrator event listeners
 * Call this on app startup
 * IDEMPOTENT: Safe to call multiple times, will only initialize once
 */
export function initializeOrchestrator(): void {
  // CRITICAL: Prevent duplicate listener registration
  // React Strict Mode, HMR, or component remounting would otherwise
  // register listeners multiple times, causing infinite loops!
  if (isInitialized) {
    logger.debug("Orchestrator already initialized, skipping");
    return;
  }

  logger.info("Initializing ecosystem orchestrator");

  // Listen to events and trigger orchestrations
  eventBus.on("problem_completed", async (event) => {
    await onProblemCompleted(event.userId, event.data);
  });

  eventBus.on("achievement_unlocked", async (event) => {
    await onAchievementUnlocked(event.userId, event.data);
  });

  eventBus.on("goal_completed", async (event) => {
    await onGoalCompleted(event.userId, event.data);
  });

  isInitialized = true;
  logger.info("Orchestrator initialized - listening to events");
}
