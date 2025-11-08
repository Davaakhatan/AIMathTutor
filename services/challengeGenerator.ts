/**
 * Challenge Generator - Agentic Action System
 * Automatically generates challenges based on user activity
 * Part of Growth System - drives viral loops and engagement
 */

import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";
import eventBus from "@/lib/eventBus";

export type ChallengeType = "beat_my_skill" | "streak_rescue" | "friend_challenge" | "topic_challenge";

export interface Challenge {
  id?: string;
  challenge_type: ChallengeType;
  challenge_text: string;
  problem_type?: string;
  difficulty?: string;
  share_code?: string;
  challenger_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Auto-generate "Beat My Skill" challenge after problem completion
 * This is the core agentic action that drives viral growth
 */
export async function generateBeatMySkillChallenge(
  userId: string,
  problemData: {
    problemText: string;
    problemType: string;
    difficulty?: string;
    profileId?: string | null;
  }
): Promise<Challenge | null> {
  try {
    logger.info("Generating Beat My Skill challenge", { userId, problemType: problemData.problemType });

    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    // Create challenge text
    const challengeText = `I just solved a ${problemData.difficulty || "middle"} school ${problemData.problemType} problem! Can you beat my skill?`;

    // Generate share code
    const shareCode = generateShareCode();

    // Save challenge to database
    const challengeData: any = {
      user_id: userId,
      student_profile_id: problemData.profileId,
      challenge_type: "beat_my_skill",
      challenge_text: challengeText,
      problem_type: problemData.problemType,
      difficulty: problemData.difficulty || "middle",
      share_code: shareCode,
      is_completed: false,
      metadata: {
        original_problem: problemData.problemText,
        generated_at: new Date().toISOString(),
      },
    };

    const { data, error } = await supabase
      .from("challenges")
      .insert(challengeData)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const challenge: Challenge = {
      id: data.id,
      challenge_type: "beat_my_skill",
      challenge_text: challengeText,
      problem_type: problemData.problemType,
      difficulty: problemData.difficulty,
      share_code: shareCode,
      challenger_id: userId,
    };

    // Emit event
    await eventBus.emit("challenge_created", userId, challenge, { profileId: problemData.profileId });

    logger.info("Beat My Skill challenge generated", { userId, challengeId: data.id, shareCode });
    return challenge;
  } catch (error) {
    logger.error("Error generating Beat My Skill challenge", { error, userId });
    return null;
  }
}

/**
 * Generate streak rescue challenge
 * Triggered when user's streak is at risk (missed yesterday's practice)
 */
export async function generateStreakRescueChallenge(
  userId: string,
  streakData: {
    currentStreak: number;
    lastStudyDate: string;
    profileId?: string | null;
  }
): Promise<Challenge | null> {
  try {
    logger.info("Generating streak rescue challenge", { userId, currentStreak: streakData.currentStreak });

    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    // Create rescue challenge text
    const challengeText = `Don't break your ${streakData.currentStreak}-day streak! Solve a quick problem to keep it alive.`;

    const challengeData: any = {
      user_id: userId,
      student_profile_id: streakData.profileId,
      challenge_type: "streak_rescue",
      challenge_text: challengeText,
      problem_type: "any", // Any problem type works for streak rescue
      difficulty: "middle",
      is_completed: false,
      metadata: {
        current_streak: streakData.currentStreak,
        last_study_date: streakData.lastStudyDate,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
    };

    const { data, error } = await supabase
      .from("challenges")
      .insert(challengeData)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const challenge: Challenge = {
      id: data.id,
      challenge_type: "streak_rescue",
      challenge_text: challengeText,
      problem_type: "any",
      difficulty: "middle",
    };

    // Emit event
    await eventBus.emit("streak_at_risk", userId, {
      currentStreak: streakData.currentStreak,
      challengeId: data.id,
    }, { profileId: streakData.profileId });

    logger.info("Streak rescue challenge generated", { userId, challengeId: data.id });
    return challenge;
  } catch (error) {
    logger.error("Error generating streak rescue challenge", { error, userId });
    return null;
  }
}

/**
 * Check if streak is at risk and generate rescue challenge if needed
 */
export async function checkAndRescueStreak(
  userId: string,
  profileId?: string | null
): Promise<Challenge | null> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return null;
    }

    // Get current streak
    let streakQuery = supabase
      .from("streaks")
      .select("current_streak, last_study_date")
      .eq("user_id", userId);

    if (profileId) {
      streakQuery = streakQuery.eq("student_profile_id", profileId);
    } else {
      streakQuery = streakQuery.is("student_profile_id", null);
    }

    const { data: streakData } = await streakQuery.single();

    if (!streakData || !streakData.last_study_date) {
      return null; // No streak to rescue
    }

    const lastStudy = new Date(streakData.last_study_date);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));

    // Streak at risk if more than 1 day ago (missed yesterday)
    if (daysDiff >= 1 && streakData.current_streak > 0) {
      logger.info("Streak at risk detected", { userId, daysDiff, currentStreak: streakData.current_streak });
      
      // Generate rescue challenge
      return await generateStreakRescueChallenge(userId, {
        currentStreak: streakData.current_streak,
        lastStudyDate: streakData.last_study_date,
        profileId,
      });
    }

    return null;
  } catch (error) {
    logger.error("Error checking streak rescue", { error, userId });
    return null;
  }
}

/**
 * Generate simple share code
 */
function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing characters
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

