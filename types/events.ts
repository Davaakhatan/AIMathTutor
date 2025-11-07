/**
 * Event System Types
 * Unified event types for ecosystem communication
 */

export type EventType =
  | "problem_completed"
  | "goal_achieved"
  | "streak_at_risk"
  | "achievement_unlocked"
  | "session_started"
  | "session_ended"
  | "challenge_created"
  | "share_clicked"
  | "referral_completed"
  | "practice_assigned"
  | "goal_created"
  | "goal_updated";

/**
 * Event data types for each event type
 */
export interface ProblemCompletedData {
  problem: {
    text: string;
    type: string;
    difficulty?: string;
  };
  sessionId: string;
  timeSpent?: number;
  hintsUsed?: number;
  attempts?: number;
}

export interface GoalAchievedData {
  goalId: string;
  goalType: string;
  targetSubject: string;
  progress: number;
}

export interface StreakAtRiskData {
  currentStreak: number;
  daysUntilLoss: number;
}

export interface AchievementUnlockedData {
  achievementId: string;
  achievementType: string;
  title: string;
}

export interface ChallengeCreatedData {
  challengeId: string;
  challengeType: string;
  shareCode?: string;
}

export interface ShareClickedData {
  shareCode: string;
  shareType: string;
  referrerId?: string;
}

export interface ReferralCompletedData {
  referralId: string;
  referrerId: string;
  refereeId: string;
}

export interface PracticeAssignedData {
  assignmentId: string;
  assignmentType: string;
  problemCount: number;
}

export interface GoalCreatedData {
  goalId: string;
  goalType: string;
  targetSubject: string;
}

export interface GoalUpdatedData {
  goalId: string;
  progress: number;
  status: string;
}

/**
 * Union type for all event data
 */
export type EventData =
  | ProblemCompletedData
  | GoalAchievedData
  | StreakAtRiskData
  | AchievementUnlockedData
  | ChallengeCreatedData
  | ShareClickedData
  | ReferralCompletedData
  | PracticeAssignedData
  | GoalCreatedData
  | GoalUpdatedData
  | Record<string, any>; // Fallback for unknown event types

/**
 * Main Event interface
 */
export interface Event {
  type: EventType;
  userId: string;
  profileId?: string;
  data: EventData;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Event handler function type
 */
export type EventHandler = (event: Event) => Promise<void> | void;

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  once?: boolean; // Only fire once, then unsubscribe
  filter?: (event: Event) => boolean; // Filter events before handling
}

