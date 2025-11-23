/**
 * Nudge Service - Smart notifications for the AI Study Companion
 * Detects at-risk conditions and creates nudges to re-engage users
 */

import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";
import eventBus from "@/lib/eventBus";

export interface Nudge {
  id?: string;
  user_id: string;
  student_profile_id?: string | null;
  type: NudgeType;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  action_url?: string;
  action_label?: string;
  dismissed: boolean;
  created_at?: string;
  expires_at?: string;
}

export type NudgeType =
  | "streak_at_risk"
  | "streak_lost"
  | "goal_reminder"
  | "comeback"
  | "achievement_close"
  | "practice_suggestion"
  | "level_up_close";

/**
 * Check if user's streak is at risk (hasn't studied today)
 */
export async function checkStreakAtRisk(
  userId: string,
  profileId?: string | null
): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    let query = supabase
      .from("streaks")
      .select("current_streak, last_study_date")
      .eq("user_id", userId);

    if (profileId) {
      query = query.eq("student_profile_id", profileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query.single();

    if (error || !data) return false;

    const today = new Date().toISOString().split("T")[0];
    const lastStudy = data.last_study_date;

    // If has a streak and hasn't studied today, streak is at risk
    if (data.current_streak > 0 && lastStudy !== today) {
      // Check if it's late in the day (after 6 PM local time)
      const hour = new Date().getHours();
      if (hour >= 18) {
        logger.info("Streak at risk detected", { userId, currentStreak: data.current_streak, lastStudy });
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error("Error checking streak at risk", { error, userId });
    return false;
  }
}

/**
 * Create a nudge for the user
 */
export async function createNudge(nudge: Omit<Nudge, "id" | "created_at" | "dismissed">): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;

    // Check for duplicate active nudges of same type
    let query = supabase
      .from("nudges")
      .select("id")
      .eq("user_id", nudge.user_id)
      .eq("type", nudge.type)
      .eq("dismissed", false);

    if (nudge.student_profile_id) {
      query = query.eq("student_profile_id", nudge.student_profile_id);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data: existing } = await query;

    if (existing && existing.length > 0) {
      logger.debug("Nudge already exists", { userId: nudge.user_id, type: nudge.type });
      return existing[0].id;
    }

    const { data, error } = await supabase
      .from("nudges")
      .insert({
        ...nudge,
        dismissed: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      // Table might not exist, create it
      if (error.code === "42P01") {
        logger.warn("Nudges table does not exist", { error: error.message });
        return null;
      }
      throw error;
    }

    logger.info("Nudge created", { userId: nudge.user_id, type: nudge.type, nudgeId: data.id });
    return data.id;
  } catch (error) {
    logger.error("Error creating nudge", { error, userId: nudge.user_id });
    return null;
  }
}

/**
 * Create streak at risk nudge
 */
export async function createStreakAtRiskNudge(
  userId: string,
  currentStreak: number,
  profileId?: string | null
): Promise<string | null> {
  const nudge: Omit<Nudge, "id" | "created_at" | "dismissed"> = {
    user_id: userId,
    student_profile_id: profileId,
    type: "streak_at_risk",
    title: "🔥 Your streak is at risk!",
    message: `You have a ${currentStreak}-day streak! Solve one problem to keep it going.`,
    priority: currentStreak > 7 ? "high" : "medium",
    action_url: "/",
    action_label: "Practice Now",
    expires_at: getEndOfDay(),
  };

  const nudgeId = await createNudge(nudge);

  if (nudgeId) {
    // Emit event for notifications
    await eventBus.emit("streak_at_risk", userId, { currentStreak }, { profileId });
  }

  return nudgeId;
}

/**
 * Get active nudges for a user
 */
export async function getActiveNudges(
  userId: string,
  profileId?: string | null
): Promise<Nudge[]> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from("nudges")
      .select("*")
      .eq("user_id", userId)
      .eq("dismissed", false);

    if (profileId) {
      query = query.eq("student_profile_id", profileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") {
        return [];
      }
      throw error;
    }

    // Filter out expired nudges
    const now = new Date().toISOString();
    return (data || []).filter((n: { expires_at?: string | null }) => !n.expires_at || n.expires_at > now);
  } catch (error) {
    logger.error("Error fetching nudges", { error, userId });
    return [];
  }
}

/**
 * Dismiss a nudge
 */
export async function dismissNudge(nudgeId: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from("nudges")
      .update({ dismissed: true })
      .eq("id", nudgeId);

    if (error) throw error;

    logger.info("Nudge dismissed", { nudgeId });
    return true;
  } catch (error) {
    logger.error("Error dismissing nudge", { error, nudgeId });
    return false;
  }
}

/**
 * Run nudge checks for a user (call on login or periodically)
 */
export async function runNudgeChecks(
  userId: string,
  profileId?: string | null
): Promise<Nudge[]> {
  const createdNudges: Nudge[] = [];

  try {
    // Check streak at risk
    const supabase = await getSupabaseClient();
    if (supabase) {
      let query = supabase
        .from("streaks")
        .select("current_streak, last_study_date")
        .eq("user_id", userId);

      if (profileId) {
        query = query.eq("student_profile_id", profileId);
      } else {
        query = query.is("student_profile_id", null);
      }

      const { data: streakData } = await query.single();

      if (streakData) {
        const today = new Date().toISOString().split("T")[0];
        const hasStreak = streakData.current_streak > 0;
        const studiedToday = streakData.last_study_date === today;
        const hour = new Date().getHours();

        if (hasStreak && !studiedToday && hour >= 18) {
          const nudgeId = await createStreakAtRiskNudge(userId, streakData.current_streak, profileId);
          if (nudgeId) {
            createdNudges.push({
              id: nudgeId,
              user_id: userId,
              student_profile_id: profileId,
              type: "streak_at_risk",
              title: "🔥 Your streak is at risk!",
              message: `You have a ${streakData.current_streak}-day streak! Solve one problem to keep it going.`,
              priority: streakData.current_streak > 7 ? "high" : "medium",
              action_url: "/",
              action_label: "Practice Now",
              dismissed: false,
            });
          }
        }
      }
    }

    logger.info("Nudge checks completed", { userId, nudgesCreated: createdNudges.length });
    return createdNudges;
  } catch (error) {
    logger.error("Error running nudge checks", { error, userId });
    return createdNudges;
  }
}

// Helper functions
function getEndOfDay(): string {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}
