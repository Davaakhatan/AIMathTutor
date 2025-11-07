/**
 * Ecosystem Orchestrator
 * 
 * Coordinates all systems when events occur:
 * - Core Tutoring → Growth + Companion + Gamification
 * - Growth → Companion + Analytics
 * - Companion → Growth + Analytics
 * 
 * This is the "brain" that makes the ecosystem work together seamlessly.
 */

import { eventBus } from "@/lib/eventBus";
import { logger } from "@/lib/logger";
import type { Event, ProblemCompletedData, GoalAchievedData, StreakAtRiskData } from "@/types/events";
import type { ParsedProblem } from "@/types";
import { createShareLink, type ShareMetadata } from "@/services/shareService";

/**
 * Ecosystem Orchestrator Class
 */
class EcosystemOrchestrator {
  /**
   * Initialize orchestrator - register event handlers
   */
  initialize(): void {
    // Register handlers for key events
    eventBus.on("problem_completed", this.onProblemCompleted.bind(this));
    eventBus.on("goal_achieved", this.onGoalAchieved.bind(this));
    eventBus.on("streak_at_risk", this.onStreakAtRisk.bind(this));
    eventBus.on("achievement_unlocked", this.onAchievementUnlocked.bind(this));
    eventBus.on("session_ended", this.onSessionEnded.bind(this));

    logger.info("Ecosystem Orchestrator initialized");
  }

  /**
   * Handle problem completion event
   * Triggers: Growth actions, Companion updates, Gamification
   */
  private async onProblemCompleted(event: Event): Promise<void> {
    const { userId, profileId, data } = event;
    const problemData = data as ProblemCompletedData;

    logger.info("Orchestrator: Handling problem_completed", {
      userId,
      profileId,
      problemType: problemData.problem?.type,
    });

    try {
      // Parallel execution for performance
      await Promise.all([
        // Growth actions
        this.triggerGrowthActions(userId, profileId || null, problemData),
        
        // Companion actions (will be implemented in Week 2)
        this.updateCompanionMemory(userId, profileId || null, problemData),
        
        // Gamification (already handled by existing system, but we can enhance)
        this.updateGamification(userId, profileId || null, problemData),
        
        // Analytics
        this.trackEvent(userId, profileId || null, "problem_completed", problemData),
      ]);
    } catch (error) {
      logger.error("Error in onProblemCompleted", { error, userId, profileId });
    }
  }

  /**
   * Trigger growth system actions after problem completion
   */
  private async triggerGrowthActions(
    userId: string,
    profileId: string | null,
    problemData: ProblemCompletedData
  ): Promise<void> {
    try {
      // Auto-generate challenge (simplified - will be enhanced in Week 3)
      // For now, just create a share link
      const shareMetadata: ShareMetadata = {
        problem_text: problemData.problem.text,
        problem_type: problemData.problem.type,
        challenge_id: problemData.sessionId, // Temporary, will be proper challenge ID later
      };

      const shareLink = await createShareLink(userId, profileId, {
        type: "problem",
        metadata: shareMetadata,
      });

      if (shareLink) {
        // Emit challenge_created event for UI updates
        await eventBus.emit({
          type: "challenge_created",
          userId,
          profileId: profileId || undefined,
          data: {
            challengeId: problemData.sessionId, // Temporary
            challengeType: "beat_my_skill",
            shareCode: shareLink.share_code,
          },
          timestamp: new Date(),
        });

        logger.info("Growth action triggered: Share link created", {
          userId,
          shareCode: shareLink.share_code,
        });
      }
    } catch (error) {
      logger.error("Error triggering growth actions", { error, userId, profileId });
    }
  }

  /**
   * Update companion memory after problem completion
   * (Will be fully implemented in Week 2)
   */
  private async updateCompanionMemory(
    userId: string,
    profileId: string | null,
    problemData: ProblemCompletedData
  ): Promise<void> {
    try {
      // TODO: Week 2 - Implement conversation summary
      // For now, just log that we would summarize
      logger.debug("Companion memory update (placeholder)", {
        userId,
        profileId,
        sessionId: problemData.sessionId,
      });

      // This will be implemented in Week 2:
      // - Summarize session
      // - Store in conversation_summaries table
      // - Check goals
      // - Update recommendations
    } catch (error) {
      logger.error("Error updating companion memory", { error, userId, profileId });
    }
  }

  /**
   * Update gamification after problem completion
   */
  private async updateGamification(
    userId: string,
    profileId: string | null,
    problemData: ProblemCompletedData
  ): Promise<void> {
    try {
      // Gamification is already handled by existing XP system
      // This is a placeholder for future enhancements
      logger.debug("Gamification update (handled by existing system)", {
        userId,
        profileId,
      });
    } catch (error) {
      logger.error("Error updating gamification", { error, userId, profileId });
    }
  }

  /**
   * Track event in analytics
   */
  private async trackEvent(
    userId: string,
    profileId: string | null,
    eventType: string,
    data: any
  ): Promise<void> {
    try {
      // TODO: Store in activity_feed table (Week 3)
      logger.debug("Event tracked", { userId, profileId, eventType });
    } catch (error) {
      logger.error("Error tracking event", { error, userId, profileId });
    }
  }

  /**
   * Handle goal achieved event
   * Triggers: Subject recommendations, Share card, Practice assignment
   */
  private async onGoalAchieved(event: Event): Promise<void> {
    const { userId, profileId, data } = event;
    const goalData = data as GoalAchievedData;

    logger.info("Orchestrator: Handling goal_achieved", {
      userId,
      profileId,
      goalType: goalData.goalType,
    });

    try {
      await Promise.all([
        // Generate subject recommendations
        this.generateSubjectRecommendations(userId, profileId || null, goalData),
        
        // Create share card
        this.createGoalShareCard(userId, profileId || null, goalData),
        
        // Assign practice (if needed)
        this.assignPracticeForGoal(userId, profileId || null, goalData),
      ]);
    } catch (error) {
      logger.error("Error in onGoalAchieved", { error, userId, profileId });
    }
  }

  /**
   * Generate subject recommendations after goal completion
   */
  private async generateSubjectRecommendations(
    userId: string,
    profileId: string | null,
    goalData: GoalAchievedData
  ): Promise<void> {
    try {
      // TODO: Week 2 - Implement recommendation engine
      logger.debug("Subject recommendations (placeholder)", {
        userId,
        goalType: goalData.goalType,
        targetSubject: goalData.targetSubject,
      });
    } catch (error) {
      logger.error("Error generating recommendations", { error, userId, profileId });
    }
  }

  /**
   * Create share card for goal achievement
   */
  private async createGoalShareCard(
    userId: string,
    profileId: string | null,
    goalData: GoalAchievedData
  ): Promise<void> {
    try {
      const shareMetadata: ShareMetadata = {
        goal_type: goalData.goalType,
        target_subject: goalData.targetSubject,
        progress: goalData.progress,
      };

      await createShareLink(userId, profileId, {
        type: "progress",
        metadata: shareMetadata,
      });

      logger.info("Goal share card created", { userId, goalId: goalData.goalId });
    } catch (error) {
      logger.error("Error creating goal share card", { error, userId, profileId });
    }
  }

  /**
   * Assign practice after goal completion
   */
  private async assignPracticeForGoal(
    userId: string,
    profileId: string | null,
    goalData: GoalAchievedData
  ): Promise<void> {
    try {
      // TODO: Week 2 - Implement practice assignment
      logger.debug("Practice assignment (placeholder)", { userId, goalId: goalData.goalId });
    } catch (error) {
      logger.error("Error assigning practice", { error, userId, profileId });
    }
  }

  /**
   * Handle streak at risk event
   * Triggers: Streak rescue challenge
   */
  private async onStreakAtRisk(event: Event): Promise<void> {
    const { userId, profileId, data } = event;
    const streakData = data as StreakAtRiskData;

    logger.info("Orchestrator: Handling streak_at_risk", {
      userId,
      profileId,
      currentStreak: streakData.currentStreak,
    });

    try {
      // TODO: Week 3 - Implement streak rescue challenge
      logger.debug("Streak rescue (placeholder)", { userId, streak: streakData.currentStreak });
    } catch (error) {
      logger.error("Error in onStreakAtRisk", { error, userId, profileId });
    }
  }

  /**
   * Handle achievement unlocked event
   * Triggers: Share card generation
   */
  private async onAchievementUnlocked(event: Event): Promise<void> {
    const { userId, profileId, data } = event;

    logger.info("Orchestrator: Handling achievement_unlocked", {
      userId,
      profileId,
      achievementId: (data as any).achievementId,
    });

    try {
      // Create share card for achievement
      const shareMetadata: ShareMetadata = {
        achievement_type: (data as any).achievementType,
        achievement_title: (data as any).title,
      };

      await createShareLink(userId, profileId || null, {
        type: "achievement",
        metadata: shareMetadata,
      });

      logger.info("Achievement share card created", { userId });
    } catch (error) {
      logger.error("Error in onAchievementUnlocked", { error, userId, profileId });
    }
  }

  /**
   * Handle session ended event
   * Triggers: Session summary, Memory update
   */
  private async onSessionEnded(event: Event): Promise<void> {
    const { userId, profileId, data } = event;

    logger.info("Orchestrator: Handling session_ended", {
      userId,
      profileId,
    });

    try {
      // TODO: Week 2 - Implement session summarization
      logger.debug("Session summary (placeholder)", { userId, sessionId: (data as any).sessionId });
    } catch (error) {
      logger.error("Error in onSessionEnded", { error, userId, profileId });
    }
  }
}

// Singleton instance
export const orchestrator = new EcosystemOrchestrator();

// Initialize on module load
if (typeof window === "undefined") {
  // Server-side only
  orchestrator.initialize();
}

