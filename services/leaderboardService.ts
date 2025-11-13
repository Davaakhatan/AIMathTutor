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
    logger.debug("Fetching global leaderboard via API route", { limit });
    
    // Use API route instead of direct client query to avoid RLS issues
    try {
      const response = await fetch(`/api/leaderboard?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.topPlayers) {
          logger.debug("Leaderboard fetched via API", { count: data.topPlayers.length });
          return data.topPlayers;
        }
      }
    } catch (apiError) {
      logger.warn("API route failed, falling back to direct query", { error: apiError });
    }

    // Fallback to direct query (may fail due to RLS)
    logger.debug("Falling back to direct query", { limit });
    const supabase = await getSupabaseClient();
    if (!supabase) {
      logger.warn("Supabase client not available for leaderboard");
      return [];
    }
    
    logger.debug("Supabase client obtained for leaderboard", { hasClient: !!supabase });

    // Query XP data directly (materialized view removed due to trigger locks)
    const { data: xpData, error: xpError } = await supabase
      .from("xp_data")
      .select("user_id, total_xp, level, updated_at")
      .is("student_profile_id", null)
      .order("total_xp", { ascending: false })
      .limit(limit);

    if (xpError) {
      logger.error("Error fetching XP data for leaderboard", { error: xpError.message, errorCode: xpError.code });
      return [];
    }

    if (!xpData || xpData.length === 0) {
      logger.warn("No XP data found for leaderboard", { 
        limit, 
        hasSupabase: !!supabase 
      });
      return [];
    }

    logger.debug("XP data fetched for leaderboard", { count: xpData.length });

    // Get user IDs
    const userIds = xpData.map((entry: any) => entry.user_id);

    // Fetch profiles, streaks, and problems in parallel
    // Note: We can't directly query auth.users, so we'll use a server-side approach
    const [profilesResult, streaksResult, problemsResult] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name").in("id", userIds),
      supabase.from("streaks").select("user_id, current_streak").is("student_profile_id", null).in("user_id", userIds),
      supabase.from("problems").select("user_id").not("solved_at", "is", null).is("student_profile_id", null).in("user_id", userIds),
    ]);

    // Helper function to extract readable name from email
    const getReadableName = (email: string | null | undefined): string => {
      if (!email) return "Anonymous";
      const parts = email.split('@');
      return parts[0] || "Anonymous";
    };

    // Fetch emails via API route (since we can't query auth.users directly from client)
    // Note: This is async but we'll wait for it before proceeding
    let emailMap = new Map<string, string>();
    try {
      const response = await fetch(`/api/leaderboard/emails?userIds=${userIds.join(',')}`);
      if (response.ok) {
        const emailData = await response.json();
        if (emailData.success && emailData.emails) {
          emailMap = new Map(Object.entries(emailData.emails));
          logger.debug("Fetched emails for leaderboard", { count: emailMap.size });
        } else {
          logger.warn("Email API returned unsuccessful response", { emailData });
        }
      } else {
        logger.warn("Email API request failed", { status: response.status, statusText: response.statusText });
      }
    } catch (error) {
      logger.warn("Failed to fetch emails for leaderboard", { error });
      // Continue without emails - we'll use "Anonymous" as fallback
    }

    // Create lookup maps
    // First, create a map for all user IDs (even if they don't have profiles)
    const allUserProfileMap = new Map<string, any>();
    
    // Add profiles that exist
    (profilesResult.data || []).forEach((p: any) => {
      const email = emailMap.get(p.id) || null;
      const readableName = getReadableName(email);
      allUserProfileMap.set(p.id, { 
        username: p.username || p.display_name || readableName, 
        displayName: p.display_name || readableName,
        email: email
      });
    });
    
    // For users without profiles, use email if available
    userIds.forEach((userId) => {
      if (!allUserProfileMap.has(userId)) {
        const email = emailMap.get(userId) || null;
        const readableName = getReadableName(email);
        allUserProfileMap.set(userId, {
          username: readableName,
          displayName: readableName,
          email: email
        });
      }
    });
    
    const profileMap = allUserProfileMap;
    const streakMap = new Map(
      (streaksResult.data || []).map((s: any) => [s.user_id, s.current_streak || 0])
    );
    const problemsMap = new Map<string, number>();
    (problemsResult.data || []).forEach((p: any) => {
      problemsMap.set(p.user_id, (problemsMap.get(p.user_id) || 0) + 1);
    });

    // Transform to leaderboard entries
    const leaderboard: LeaderboardEntry[] = xpData.map((entry: any) => {
      const rankInfo = getRankForLevel(entry.level);
      const profile = profileMap.get(entry.user_id) as any;
      
      // Get username - prefer profile data, fallback to email-derived name
      const username = profile?.username || profile?.displayName || "Anonymous";
      const displayName = profile?.displayName || username;
      
      return {
        userId: entry.user_id,
        username: username,
        displayName: displayName,
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

    logger.debug("Leaderboard fetched successfully", { 
      count: leaderboard.length,
      sampleEntry: leaderboard[0] ? {
        userId: leaderboard[0].userId,
        username: leaderboard[0].username,
        totalXP: leaderboard[0].totalXP
      } : null
    });
    
    if (leaderboard.length === 0) {
      logger.warn("Leaderboard is empty - no XP data found", { 
        xpDataCount: xpData?.length || 0,
        userIdsCount: userIds.length 
      });
    }
    
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
    // Try API route first (more reliable)
    try {
      const response = await fetch(`/api/leaderboard?userId=${userId}&limit=${topN}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          logger.debug("Leaderboard data fetched via API", {
            topPlayersCount: data.topPlayers?.length || 0,
            userRank: data.userRank,
            hasUserEntry: !!data.userEntry
          });
          return {
            topPlayers: data.topPlayers || [],
            userRank: data.userRank,
            userEntry: data.userEntry,
            totalPlayers: data.totalPlayers || 0,
          };
        }
      }
    } catch (apiError) {
      logger.warn("API route failed, falling back to direct queries", { error: apiError });
    }

    // Fallback to direct queries
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
          // Fetch email via API route
          let username = (xpData as any).profiles?.username || (xpData as any).profiles?.display_name || "You";
          try {
            const response = await fetch(`/api/leaderboard/emails?userIds=${userId}`);
            if (response.ok) {
              const emailData = await response.json();
              if (emailData.success && emailData.emails && emailData.emails[userId]) {
                const email = emailData.emails[userId];
                const emailParts = email.split('@');
                username = (xpData as any).profiles?.username || (xpData as any).profiles?.display_name || emailParts[0] || "You";
              }
            }
          } catch (error) {
            logger.warn("Failed to fetch email for user entry", { error });
          }

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

          const rank = getRankForLevel(xpData.level);
          userEntry = {
            userId: xpData.user_id,
            username: username,
            displayName: (xpData as any).profiles?.display_name || username,
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

