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
    logger.debug("Fetching global leaderboard", { limit });
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available for leaderboard");
      return [];
    }

    // Use Promise.all to fetch all data in parallel for speed
    const [xpResult, streaksResult, profilesResult] = await Promise.all([
      // Get XP data
      supabase
        .from("xp_data")
        .select("user_id, total_xp, level, updated_at")
        .is("student_profile_id", null)
        .order("total_xp", { ascending: false })
        .order("level", { ascending: false })
        .limit(limit),
      
      // Get all streaks at once
      supabase
        .from("streaks")
        .select("user_id, current_streak")
        .is("student_profile_id", null),
      
      // Get all profiles at once
      supabase
        .from("profiles")
        .select("id, username, display_name")
    ]);

    if (xpResult.error) {
      logger.error("Error fetching XP data for leaderboard", { error: xpResult.error.message });
      return [];
    }

    if (!xpResult.data || xpResult.data.length === 0) {
      logger.info("No XP data found for leaderboard");
      return [];
    }

    // Create maps for fast lookups
    const streakMap = new Map(
      (streaksResult.data || []).map((s: any) => [s.user_id, s.current_streak || 0])
    );

    const profileMap = new Map(
      (profilesResult.data || []).map((p: any) => [p.id, { username: p.username, displayName: p.display_name }])
    );

    // Get user IDs for problems query
    const userIds = xpResult.data.map((entry: any) => entry.user_id);

    // Fetch problems count (this is often the slowest query, so do it separately)
    const { data: problemsData, error: problemsError } = await supabase
      .from("problems")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "solved")
      .is("student_profile_id", null);

    if (problemsError) {
      logger.warn("Error fetching problems for leaderboard", { error: problemsError.message });
    }

    // Count problems per user
    const problemsMap = new Map<string, number>();
    (problemsData || []).forEach((p: any) => {
      problemsMap.set(p.user_id, (problemsMap.get(p.user_id) || 0) + 1);
    });

    // Transform data
    const leaderboard: LeaderboardEntry[] = xpResult.data.map((entry: any) => {
      const rank = getRankForLevel(entry.level);
      const profile = profileMap.get(entry.user_id);
      
      return {
        userId: entry.user_id,
        username: profile?.username || "Anonymous",
        displayName: profile?.displayName,
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

    logger.debug("Leaderboard fetched successfully", { count: leaderboard.length });
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

