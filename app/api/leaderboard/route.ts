import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { getRankForLevel } from "@/services/rankingService";

/**
 * API route to fetch leaderboard data server-side
 * This bypasses RLS issues and provides reliable leaderboard data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    // Query XP data
    const { data: xpData, error: xpError } = await supabase
      .from("xp_data")
      .select("user_id, total_xp, level, updated_at")
      .is("student_profile_id", null)
      .order("total_xp", { ascending: false })
      .limit(limit);

    if (xpError) {
      logger.error("Error fetching XP data for leaderboard", { error: xpError.message, errorCode: xpError.code });
      return NextResponse.json({ success: false, error: xpError.message }, { status: 500 });
    }

    if (!xpData || xpData.length === 0) {
      logger.warn("No XP data found for leaderboard");
      return NextResponse.json({ 
        success: true, 
        topPlayers: [], 
        userRank: null, 
        userEntry: null,
        totalPlayers: 0
      });
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
      for (const userId of userIds) {
        try {
          const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
          if (!userError && userData?.user?.email) {
            emailMap.set(userId, userData.user.email);
          }
        } catch (err) {
          // Skip this user
        }
      }
    }

    // Helper function to extract readable name from email
    const getReadableName = (email: string | null | undefined): string => {
      if (!email) return "Anonymous";
      const parts = email.split('@');
      return parts[0] || "Anonymous";
    };

    // Create lookup maps
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
    userIds.forEach((uid) => {
      if (!allUserProfileMap.has(uid)) {
        const email = emailMap.get(uid) || null;
        const readableName = getReadableName(email);
        allUserProfileMap.set(uid, {
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
    const topPlayers = xpData.map((entry: any) => {
      const rankInfo = getRankForLevel(entry.level);
      const profile = profileMap.get(entry.user_id) as any;
      
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

    // Get user's rank
    const userEntry = xpData.find((e: any) => e.user_id === userId) as any;
    const userXP = userEntry?.total_xp || 0;
    let userRank = xpData.findIndex((e: any) => e.user_id === userId) + 1;
    if (userRank === 0 && userXP > 0) {
      // User not in top N, calculate rank
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
      // Fetch user data separately
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
        const rank = getRankForLevel(userXPData.level);
        userEntry = {
          userId: userXPData.user_id,
          username: profile?.username || profile?.displayName || "You",
          displayName: profile?.displayName || profile?.username || "You",
          totalXP: userXPData.total_xp || 0,
          level: userXPData.level || 1,
          rank: rank.title,
          rankBadge: rank.badge,
          rankColor: rank.color,
          problemsSolved: problemCount || 0,
          currentStreak: streakData?.current_streak || 0,
          lastActive: userXPData.updated_at,
        };
      }
    }

    logger.debug("Leaderboard API response", { 
      topPlayersCount: topPlayers.length,
      userRank: userRank || null,
      hasUserEntry: !!userEntry
    });

    return NextResponse.json({
      success: true,
      topPlayers,
      userRank: userRank || null,
      userEntry,
      totalPlayers: topPlayers.length,
    });
  } catch (error) {
    logger.error("Exception in GET /api/leaderboard", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

