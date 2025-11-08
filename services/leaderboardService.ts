/**
 * Leaderboard Service
 * Fetches real leaderboard data from Supabase
 */

import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { getRankForLevel } from "./rankingService";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName?: string;
  totalXP: number;
  level: number;
  rank: string; // Rank title (e.g., "Scholar", "Expert")
  rankBadge: string; // Badge (e.g., "III", "IV")
  rankColor: string; // Color for the rank
  problemsSolved: number;
  currentStreak: number;
  lastActive: string; // ISO timestamp
}

export interface LeaderboardData {
  topPlayers: LeaderboardEntry[];
  userRank: number | null;
  userEntry: LeaderboardEntry | null;
  totalPlayers: number;
}

/**
 * Get global leaderboard (top N players)
 */
export async function getGlobalLeaderboard(
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available for leaderboard");
      return [];
    }

    // Query xp_data joined with profiles for username
    // Only get personal XP (student_profile_id IS NULL)
    const { data, error } = await supabase
      .from("xp_data")
      .select(`
        user_id,
        total_xp,
        level,
        updated_at,
        profiles!inner(
          username,
          display_name
        )
      `)
      .is("student_profile_id", null)
      .order("total_xp", { ascending: false })
      .order("level", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching global leaderboard", { error: error.message });
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get streak data for these users
    const userIds = data.map((entry: any) => entry.user_id);
    const { data: streakData } = await supabase
      .from("streaks")
      .select("user_id, current_streak")
      .in("user_id", userIds)
      .is("student_profile_id", null);

    // Create a map of userId -> currentStreak
    const streakMap = new Map(
      (streakData || []).map((s: any) => [s.user_id, s.current_streak])
    );

    // Get problems solved count for these users
    const { data: problemsData } = await supabase
      .from("problems")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "solved")
      .is("student_profile_id", null);

    // Count problems per user
    const problemsMap = new Map<string, number>();
    (problemsData || []).forEach((p: any) => {
      problemsMap.set(p.user_id, (problemsMap.get(p.user_id) || 0) + 1);
    });

    // Transform data
    const leaderboard: LeaderboardEntry[] = data.map((entry: any) => {
      const rank = getRankForLevel(entry.level);
      return {
        userId: entry.user_id,
        username: entry.profiles?.username || "Anonymous",
        displayName: entry.profiles?.display_name,
        totalXP: entry.total_xp || 0,
        level: entry.level || 1,
        rank: rank.title,
        rankBadge: rank.badge,
        rankColor: rank.color,
        problemsSolved: problemsMap.get(entry.user_id) || 0,
        currentStreak: streakMap.get(entry.user_id) || 0,
        lastActive: entry.updated_at,
      };
    });

    return leaderboard;
  } catch (error) {
    logger.error("Exception in getGlobalLeaderboard", { error });
    return [];
  }
}

/**
 * Get user's rank in the global leaderboard
 */
export async function getUserRank(userId: string): Promise<number | null> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return null;
    }

    // Get user's XP
    const { data: userData } = await supabase
      .from("xp_data")
      .select("total_xp")
      .eq("user_id", userId)
      .is("student_profile_id", null)
      .single();

    if (!userData) {
      return null;
    }

    const userXP = userData.total_xp || 0;

    // Count how many users have more XP
    const { count } = await supabase
      .from("xp_data")
      .select("user_id", { count: "exact", head: true })
      .gt("total_xp", userXP)
      .is("student_profile_id", null);

    // Rank is count + 1 (1-indexed)
    return count !== null ? count + 1 : null;
  } catch (error) {
    logger.error("Error getting user rank", { error, userId });
    return null;
  }
}

/**
 * Get full leaderboard data for a user
 */
export async function getLeaderboardData(
  userId: string,
  topN: number = 100
): Promise<LeaderboardData> {
  try {
    // Get top players
    const topPlayers = await getGlobalLeaderboard(topN);

    // Get user's rank
    const userRank = await getUserRank(userId);

    // Find user in top players or fetch separately
    let userEntry = topPlayers.find((p) => p.userId === userId) || null;

    // If user not in top N, fetch their data separately
    if (!userEntry) {
      const supabase = await getSupabaseClient();
      if (supabase) {
        const { data: xpData } = await supabase
          .from("xp_data")
          .select(`
            user_id,
            total_xp,
            level,
            updated_at,
            profiles!inner(
              username,
              display_name
            )
          `)
          .eq("user_id", userId)
          .is("student_profile_id", null)
          .single();

        if (xpData) {
          const { data: streakData } = await supabase
            .from("streaks")
            .select("current_streak")
            .eq("user_id", userId)
            .is("student_profile_id", null)
            .single();

          const { count: problemCount } = await supabase
            .from("problems")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "solved")
            .is("student_profile_id", null);

          const rank = getRankForLevel(xpData.level);
          userEntry = {
            userId: xpData.user_id,
            username: (xpData as any).profiles?.username || "You",
            displayName: (xpData as any).profiles?.display_name,
            totalXP: xpData.total_xp || 0,
            level: xpData.level || 1,
            rank: rank.title,
            rankBadge: rank.badge,
            rankColor: rank.color,
            problemsSolved: problemCount || 0,
            currentStreak: streakData?.current_streak || 0,
            lastActive: xpData.updated_at,
          };
        }
      }
    }

    return {
      topPlayers,
      userRank,
      userEntry,
      totalPlayers: topPlayers.length,
    };
  } catch (error) {
    logger.error("Error getting leaderboard data", { error, userId });
    return {
      topPlayers: [],
      userRank: null,
      userEntry: null,
      totalPlayers: 0,
    };
  }
}

/**
 * Get leaderboard filtered by rank
 */
export async function getLeaderboardByRank(
  rankTitle: string,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const allPlayers = await getGlobalLeaderboard(1000); // Get more to filter
  return allPlayers.filter((p) => p.rank === rankTitle).slice(0, limit);
}

