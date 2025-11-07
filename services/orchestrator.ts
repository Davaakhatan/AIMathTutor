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
import { createShare, type ShareMetadata } from "@/services/shareService";
import { summarizeSession } from "@/services/conversationSummaryService";
import { contextManager } from "@/services/contextManager";
import { checkGoalProgress } from "@/services/goalService";
import { getSubjectRecommendations } from "@/services/recommendationService";

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

    console.log("🚀 Ecosystem Orchestrator initialized and ready!");
    logger.info("Ecosystem Orchestrator initialized");
  }

  /**
   * Handle problem completion event
   * Triggers: Growth actions, Companion updates, Gamification
   */
  private async onProblemCompleted(event: Event): Promise<void> {
    const { userId, profileId, data } = event;
    const problemData = data as ProblemCompletedData;

    console.log("🎯 ORCHESTRATOR: Received problem_completed event", {
      userId,
      profileId,
      problemType: problemData.problem?.type,
      sessionId: problemData.sessionId,
    });

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

      const shareLink = await createShare(
        userId,
        "problem",
        shareMetadata,
        profileId
      );

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
   * Summarizes the session and stores it for future reference
   */
  private async updateCompanionMemory(
    userId: string,
    profileId: string | null,
    problemData: ProblemCompletedData
  ): Promise<void> {
    try {
      // Get session messages for summarization
      const session = await contextManager.getSession(problemData.sessionId, userId);
      if (!session || !session.messages || session.messages.length === 0) {
        logger.debug("No session or messages found for summarization", {
          userId,
          sessionId: problemData.sessionId,
        });
        return;
      }

      // Generate summary
      const summary = await summarizeSession(
        userId,
        profileId,
        problemData.sessionId,
        {
          messages: session.messages,
          problemText: problemData.problem.text,
          problemType: problemData.problem.type,
          difficultyLevel: problemData.problem.difficulty,
          hintsUsed: problemData.hintsUsed || 0,
          timeSpent: problemData.timeSpent || 0,
          attempts: problemData.attempts || 0,
        }
      );

      if (summary) {
        console.log("✅ CONVERSATION SUMMARY CREATED!", {
          summaryId: summary.id,
          userId,
          profileId,
          conceptsCount: summary.concepts_covered.length,
          summaryPreview: summary.summary.substring(0, 100),
        });
        
        logger.info("Conversation summary created", {
          userId,
          profileId,
          summaryId: summary.id,
          conceptsCount: summary.concepts_covered.length,
        });

        // Check and update goal progress
        const goalUpdates = await checkGoalProgress(
          userId,
          profileId,
          problemData.problem.type,
          problemData.problem.text
        );

        // Emit goal_achieved events for completed goals
        for (const completedGoal of goalUpdates.completedGoals) {
          await eventBus.emit({
            type: "goal_achieved",
            userId,
            profileId: profileId || undefined,
            data: {
              goalId: completedGoal.id,
              goalType: completedGoal.goal_type,
              targetSubject: completedGoal.target_subject,
              progress: completedGoal.progress,
            },
            timestamp: new Date(),
          });
        }

        // Emit session_ended event for UI updates
        await eventBus.emit({
          type: "session_ended",
          userId,
          profileId: profileId || undefined,
          data: {
            sessionId: problemData.sessionId,
            summaryId: summary.id,
            concepts: summary.concepts_covered,
            goalsUpdated: goalUpdates.updatedGoals.length,
            goalsCompleted: goalUpdates.completedGoals.length,
          },
          timestamp: new Date(),
        });
      } else {
        logger.warn("Failed to create conversation summary", {
          userId,
          sessionId: problemData.sessionId,
        });
      }
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
   * Critical for churn reduction - suggests next learning path
   */
  private async generateSubjectRecommendations(
    userId: string,
    profileId: string | null,
    goalData: GoalAchievedData
  ): Promise<void> {
    try {
      const recommendations = await getSubjectRecommendations(
        userId,
        profileId,
        goalData.targetSubject,
        goalData.goalType
      );

      if (recommendations.length > 0) {
        logger.info("Subject recommendations generated", {
          userId,
          goalId: goalData.goalId,
          recommendationsCount: recommendations.length,
          topRecommendation: recommendations[0]?.subject,
        });

        // Store recommendations in goal metadata for later retrieval
        // This can be used by UI to show recommendations
        // For now, we just log them - UI can fetch via API
      } else {
        logger.debug("No recommendations generated", {
          userId,
          targetSubject: goalData.targetSubject,
        });
      }
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

      await createShare(
        userId,
        "progress",
        shareMetadata,
        profileId
      );

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

      await createShare(
        userId,
        "achievement",
        shareMetadata,
        profileId || null
      );

      logger.info("Achievement share card created", { userId });
    } catch (error) {
      logger.error("Error in onAchievementUnlocked", { error, userId, profileId });
    }
  }

  /**
   * Handle session ended event
   * This is triggered after a summary is created
   * Can be used for additional post-processing
   */
  private async onSessionEnded(event: Event): Promise<void> {
    const { userId, profileId, data } = event;

    logger.info("Orchestrator: Handling session_ended", {
      userId,
      profileId,
      sessionId: (data as any).sessionId,
    });

    try {
      // Summary is already created by updateCompanionMemory
      // This handler can be used for additional processing:
      // - Check goals progress
      // - Generate recommendations
      // - Update learning path
      logger.debug("Session ended, summary created", {
        userId,
        sessionId: (data as any).sessionId,
        summaryId: (data as any).summaryId,
      });
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

