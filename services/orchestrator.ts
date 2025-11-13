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

    // DISABLED: XP/Streak updates are handled by XPSystem component
    // The orchestrator should NOT duplicate these updates
    // 
    // // 1. Update XP
    // const currentXP = await getXPData(userId, profileId);
    // if (currentXP) {
    //   const xpGained = calculateXPForProblem(problemData.difficulty, problemData.hintsUsed);
    //   const newTotalXP = currentXP.total_xp + xpGained;
    //   const newLevel = calculateLevel(newTotalXP);
    //
    //   await updateXPData(userId, {
    //     total_xp: newTotalXP,
    //     level: newLevel,
    //     xp_history: [
    //       ...(currentXP.xp_history || []),
    //       {
    //         date: new Date().toISOString(),
    //         xp: xpGained,
    //         reason: `Solved ${problemData.problemType} problem`,
    //       },
    //     ],
    //   }, profileId);
    //
    //   logger.info("XP updated for problem completion", { userId, xpGained, newLevel });
    // }
    //
    // // 2. Update Streak
    // const today = new Date().toISOString().split("T")[0];
    // const currentStreak = await getStreakData(userId, profileId);
    // if (currentStreak) {
    //   const lastStudyDate = currentStreak.last_study_date;
    //   const shouldIncrementStreak = !lastStudyDate || lastStudyDate !== today;
    //
    //   if (shouldIncrementStreak) {
    //     const newStreak = (currentStreak.current_streak || 0) + 1;
    //     await updateStreakData(userId, {
    //       current_streak: newStreak,
    //       longest_streak: Math.max(newStreak, currentStreak.longest_streak || 0),
    //       last_study_date: today,
    //     }, profileId);
    //
    //     logger.info("Streak updated for problem completion", { userId, newStreak });
    //   }
    // }

    // 3. NOTE: Do NOT emit "problem_completed" event here - that would cause infinite recursion!
    // The orchestrator is already listening to "problem_completed" events, so emitting here
    // would cause this function to be called again, creating an infinite loop.
    // Other systems should listen to the original event emission (from ProblemProgress, etc.)

    // 4. Check and update goals (Week 2) - IMPLEMENTED
    await checkGoalsForProblem(userId, problemData.problemType, profileId);

    // 5. Auto-generate "Beat My Skill" challenge (Week 3) - IMPLEMENTED
    const challenge = await generateBeatMySkillChallenge(userId, problemData);
    if (challenge) {
      logger.info("Auto-challenge generated after problem completion", { 
        userId, 
        challengeId: challenge.id,
        shareCode: challenge.share_code
      });
    }

    // 6. Update conversation summary (Week 2)
    // TODO: Pass messages array from problem completion event
    // Will be implemented when session management is integrated

    // 7. TODO: Create additional share links (Week 3 - advanced)
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
