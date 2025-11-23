/**
 * Leaderboard Backend Service
 * Handles all leaderboard-related database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { getRankForLevel } from "@/services/rankingService";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  totalXP: number;
  level: number;
  rank: string;
  rankBadge: string;
  rankColor: string;
  problemsSolved: number;
  currentStreak: number;
  lastActive: string;
}

export interface LeaderboardResult {
  success: boolean;
  topPlayers: LeaderboardEntry[];
  userRank: number | null;
  userEntry: LeaderboardEntry | null;
  totalPlayers: number;
  error?: string;
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
  userId: string,
  limit: number = 100
): Promise<LeaderboardResult> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return {
        success: false,
        topPlayers: [],
        userRank: null,
        userEntry: null,
        totalPlayers: 0,
        error: "Database not configured"
      };
    }

    // Query XP data - fetch all and filter in memory
    // Supabase .is() is unreliable for null checks
    const { data: rawXpData, error: xpError } = await supabase
      .from("xp_data")
      .select("user_id, total_xp, level, updated_at, student_profile_id")
      .order("total_xp", { ascending: false })
      .limit(limit * 2); // Fetch more to account for filtering

    if (xpError) {
      logger.error("Error fetching XP data for leaderboard", { error: xpError.message });
      return {
        success: false,
        topPlayers: [],
        userRank: null,
        userEntry: null,
        totalPlayers: 0,
        error: xpError.message
      };
    }

    // Filter for records without student_profile_id in memory
    // Also deduplicate by user_id, keeping the highest XP record
    const filteredData = (rawXpData || []).filter((r: any) => r.student_profile_id == null);

    // Group by user_id and keep highest XP
    const userXpMap = new Map<string, any>();
    filteredData.forEach((r: any) => {
      const existing = userXpMap.get(r.user_id);
      if (!existing || (r.total_xp || 0) > (existing.total_xp || 0)) {
        userXpMap.set(r.user_id, r);
      }
    });

    // Convert back to array and sort by XP
    const xpData = Array.from(userXpMap.values())
      .sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0))
      .slice(0, limit);

    // Log for debugging
    logger.debug("Leaderboard XP query", {
      rawCount: rawXpData?.length || 0,
      filteredCount: xpData.length,
      // Show first few raw records with their profile IDs for debugging
      sample: rawXpData?.slice(0, 5).map((r: any) => ({
        userId: r.user_id?.substring(0, 8),
        xp: r.total_xp,
        profileId: r.student_profile_id
      }))
    });

    if (!xpData || xpData.length === 0) {
      return {
        success: true,
        topPlayers: [],
        userRank: null,
        userEntry: null,
        totalPlayers: 0
      };
    }

    const userIds = xpData.map((entry: any) => entry.user_id);

    // Fetch profiles, streaks, and problems in parallel
    const [profilesResult, streaksResult, problemsResult] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name").in("id", userIds),
      supabase.from("streaks").select("user_id, current_streak").is("student_profile_id", null).in("user_id", userIds),
      supabase.from("problems").select("user_id").not("solved_at", "is", null).is("student_profile_id", null).in("user_id", userIds),
    ]);

    // Fetch emails using admin client
    const emailMap = new Map<string, string>();
    const adminSupabase = getSupabaseAdmin();
    if (adminSupabase) {
      for (const uid of userIds) {
        try {
          const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(uid);
          if (!userError && userData?.user?.email) {
            emailMap.set(uid, userData.user.email);
          }
        } catch {
          // Skip this user
        }
      }
    }

    // Helper function
    const getReadableName = (email: string | null | undefined): string => {
      if (!email) return "Anonymous";
      return email.split('@')[0] || "Anonymous";
    };

    // Create profile map
    const profileMap = new Map<string, any>();
    (profilesResult.data || []).forEach((p: any) => {
      const email = emailMap.get(p.id) || null;
      const readableName = getReadableName(email);
      profileMap.set(p.id, {
        username: p.username || p.display_name || readableName,
        displayName: p.display_name || readableName,
        email
      });
    });

    // Add users without profiles
    userIds.forEach((uid) => {
      if (!profileMap.has(uid)) {
        const email = emailMap.get(uid) || null;
        const readableName = getReadableName(email);
        profileMap.set(uid, { username: readableName, displayName: readableName, email });
      }
    });

    // Create other maps
    const streakMap = new Map(
      (streaksResult.data || []).map((s: any) => [s.user_id, s.current_streak || 0])
    );
    const problemsMap = new Map<string, number>();
    (problemsResult.data || []).forEach((p: any) => {
      problemsMap.set(p.user_id, (problemsMap.get(p.user_id) || 0) + 1);
    });

    // Transform to leaderboard entries
    const topPlayers: LeaderboardEntry[] = xpData.map((entry: any) => {
      const rankInfo = getRankForLevel(entry.level);
      const profile = profileMap.get(entry.user_id);
      const username = profile?.username || profile?.displayName || "Anonymous";

      return {
        userId: entry.user_id,
        username,
        displayName: profile?.displayName || username,
        totalXP: entry.total_xp || 0,
        level: entry.level || 1,
        rank: rankInfo.title,
        rankBadge: rankInfo.badge,
        rankColor: rankInfo.color,
        problemsSolved: problemsMap.get(entry.user_id) || 0,
        currentStreak: streakMap.get(entry.user_id) || 0,
        lastActive: entry.updated_at || new Date().toISOString(),
      };
    });

    // Get user's rank
    const userXPEntry = xpData.find((e: any) => e.user_id === userId);
    const userXP = (userXPEntry as any)?.total_xp || 0;
    let userRank: number | null = xpData.findIndex((e: any) => e.user_id === userId) + 1;

    if (userRank === 0 && userXP > 0) {
      const { count } = await supabase
        .from("xp_data")
        .select("user_id", { count: "exact", head: true })
        .gt("total_xp", userXP)
        .is("student_profile_id", null);
      userRank = (count || 0) + 1;
    } else if (userRank === 0) {
      userRank = null;
    }

    // Get user entry
    let userEntry = topPlayers.find((p) => p.userId === userId) || null;
    if (!userEntry && userXP > 0) {
      const { data: userXPData } = await supabase
        .from("xp_data")
        .select("user_id, total_xp, level, updated_at")
        .eq("user_id", userId)
        .is("student_profile_id", null)
        .single();

      if (userXPData) {
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
          .not("solved_at", "is", null)
          .is("student_profile_id", null);

        const profile = profileMap.get(userId);
        const xpEntry = userXPData as any;
        const rankInfo = getRankForLevel(xpEntry.level || 1);

        userEntry = {
          userId: xpEntry.user_id,
          username: profile?.username || "You",
          displayName: profile?.displayName || "You",
          totalXP: xpEntry.total_xp || 0,
          level: xpEntry.level || 1,
          rank: rankInfo.title,
          rankBadge: rankInfo.badge,
          rankColor: rankInfo.color,
          problemsSolved: problemCount || 0,
          currentStreak: (streakData as any)?.current_streak || 0,
          lastActive: xpEntry.updated_at,
        };
      }
    }

    logger.debug("Leaderboard fetched", {
      topPlayersCount: topPlayers.length,
      userRank,
      hasUserEntry: !!userEntry
    });

    return {
      success: true,
      topPlayers,
      userRank,
      userEntry,
      totalPlayers: topPlayers.length
    };
  } catch (error) {
    logger.error("Exception fetching leaderboard", { error });
    return {
      success: false,
      topPlayers: [],
      userRank: null,
      userEntry: null,
      totalPlayers: 0,
      error: String(error)
    };
  }
}
