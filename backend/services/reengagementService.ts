/**
 * Re-engagement Nudge Service
 * Generates personalized nudges to bring users back based on their activity patterns
 */

import { getSupabaseServer } from "@/lib/supabase-server";

export interface ReengagementNudge {
  id: string;
  type: "streak_at_risk" | "comeback" | "milestone_close" | "skill_decay" | "daily_goal" | "achievement_progress";
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
  action?: {
    label: string;
    type: "practice" | "challenge" | "review";
    data?: Record<string, unknown>;
  };
  expiresAt?: Date;
}

export interface UserEngagementData {
  lastActive: Date | null;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  problemsToday: number;
  dailyGoal: number;
  recentSubjects: string[];
  level: number;
  xpToNextLevel: number;
}

/**
 * Get user engagement data for nudge generation
 */
async function getUserEngagementData(
  userId: string,
  profileId?: string | null
): Promise<UserEngagementData | null> {
  try {
    const supabase = getSupabaseServer();

    // Get XP data
    const xpQuery = supabase
      .from("user_xp")
      .select("total_xp, current_streak, longest_streak, last_activity_date, level")
      .eq("user_id", userId);

    if (profileId) {
      xpQuery.eq("profile_id", profileId);
    } else {
      xpQuery.is("profile_id", null);
    }

    const { data: xpData } = await xpQuery.single();

    // Get today's problem count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const historyQuery = supabase
      .from("problem_history")
      .select("problem_type, created_at")
      .eq("user_id", userId)
      .gte("created_at", today.toISOString());

    if (profileId) {
      historyQuery.eq("profile_id", profileId);
    }

    const { data: todayProblems } = await historyQuery;

    // Get recent subjects (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentQuery = supabase
      .from("problem_history")
      .select("problem_type")
      .eq("user_id", userId)
      .gte("created_at", weekAgo.toISOString());

    if (profileId) {
      recentQuery.eq("profile_id", profileId);
    }

    const { data: recentProblems } = await recentQuery;

    // Calculate XP to next level
    const currentXP = xpData?.total_xp || 0;
    const currentLevel = xpData?.level || 1;
    const xpForNextLevel = currentLevel * 100;
    const xpInCurrentLevel = currentXP - ((currentLevel - 1) * currentLevel * 50);
    const xpToNextLevel = xpForNextLevel - xpInCurrentLevel;

    return {
      lastActive: xpData?.last_activity_date ? new Date(xpData.last_activity_date) : null,
      currentStreak: xpData?.current_streak || 0,
      longestStreak: xpData?.longest_streak || 0,
      totalXP: currentXP,
      problemsToday: todayProblems?.length || 0,
      dailyGoal: 5, // Default daily goal
      recentSubjects: [...new Set((recentProblems || []).map((p: { problem_type: string }) => p.problem_type))],
      level: currentLevel,
      xpToNextLevel: Math.max(0, xpToNextLevel),
    };
  } catch (error) {
    console.error("Error getting engagement data:", error);
    return null;
  }
}

/**
 * Generate personalized re-engagement nudges for a user
 */
export async function generateReengagementNudges(
  userId: string,
  profileId?: string | null
): Promise<ReengagementNudge[]> {
  const nudges: ReengagementNudge[] = [];
  const engagement = await getUserEngagementData(userId, profileId);

  if (!engagement) {
    return nudges;
  }

  const now = new Date();
  const daysSinceActive = engagement.lastActive
    ? Math.floor((now.getTime() - engagement.lastActive.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // 1. Streak at risk - hasn't practiced today and has a streak
  if (engagement.problemsToday === 0 && engagement.currentStreak > 0) {
    const hoursLeft = 24 - now.getHours();
    nudges.push({
      id: "streak-at-risk",
      type: "streak_at_risk",
      title: "Streak at Risk!",
      message: `Your ${engagement.currentStreak}-day streak ends in ${hoursLeft} hours. Solve one problem to keep it going!`,
      priority: engagement.currentStreak >= 7 ? "high" : "medium",
      action: {
        label: "Quick Practice",
        type: "practice",
      },
    });
  }

  // 2. Comeback nudge - been away for a while
  if (daysSinceActive >= 3 && daysSinceActive < 30) {
    nudges.push({
      id: "comeback",
      type: "comeback",
      title: "Welcome Back!",
      message: daysSinceActive >= 7
        ? `We missed you! It's been ${daysSinceActive} days. Ready to get back on track?`
        : `It's been ${daysSinceActive} days since your last practice. Let's pick up where you left off!`,
      priority: daysSinceActive >= 7 ? "high" : "medium",
      action: {
        label: "Start Fresh",
        type: "review",
      },
    });
  }

  // 3. Close to milestone - level up or XP milestone
  if (engagement.xpToNextLevel <= 30 && engagement.xpToNextLevel > 0) {
    nudges.push({
      id: "milestone-close",
      type: "milestone_close",
      title: "Almost There!",
      message: `Just ${engagement.xpToNextLevel} XP to reach Level ${engagement.level + 1}! One or two problems will get you there.`,
      priority: "high",
      action: {
        label: "Level Up",
        type: "challenge",
      },
    });
  }

  // 4. Daily goal progress
  if (engagement.problemsToday > 0 && engagement.problemsToday < engagement.dailyGoal) {
    const remaining = engagement.dailyGoal - engagement.problemsToday;
    nudges.push({
      id: "daily-goal",
      type: "daily_goal",
      title: "Keep Going!",
      message: `You've solved ${engagement.problemsToday} of ${engagement.dailyGoal} problems today. Just ${remaining} more to hit your goal!`,
      priority: remaining <= 2 ? "high" : "low",
      action: {
        label: "Continue",
        type: "practice",
      },
    });
  }

  // 5. Skill decay warning - subjects not practiced recently
  if (engagement.recentSubjects.length > 0 && engagement.recentSubjects.length < 3) {
    const allSubjects = ["algebra", "geometry", "arithmetic", "fractions", "word problems"];
    const neglectedSubjects = allSubjects.filter(s => !engagement.recentSubjects.includes(s));

    if (neglectedSubjects.length > 0) {
      nudges.push({
        id: "skill-decay",
        type: "skill_decay",
        title: "Mix It Up",
        message: `You've been focused on ${engagement.recentSubjects.join(", ")}. Try some ${neglectedSubjects[0]} to keep skills sharp!`,
        priority: "low",
        action: {
          label: "Try Something New",
          type: "practice",
          data: { subject: neglectedSubjects[0] },
        },
      });
    }
  }

  // 6. New user encouragement
  if (engagement.totalXP < 50 && engagement.totalXP > 0) {
    nudges.push({
      id: "new-user",
      type: "achievement_progress",
      title: "Great Start!",
      message: `You've earned ${engagement.totalXP} XP so far. Keep practicing to unlock achievements!`,
      priority: "low",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Return top 3 nudges
  return nudges.slice(0, 3);
}

/**
 * Check if user should receive nudges (rate limiting)
 */
export async function shouldShowNudges(userId: string): Promise<boolean> {
  // For now, always show nudges
  // Could add rate limiting logic here (e.g., only show once per session)
  return true;
}
