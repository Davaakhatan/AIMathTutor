/**
 * Student Analytics API
 * Returns detailed analytics for a student profile
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

async function getEffectiveUserId(userId: string, profileId: string | null): Promise<string> {
  if (!profileId) return userId;

  const supabase = getSupabaseServer();
  if (!supabase) return userId;

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("owner_id")
    .eq("id", profileId)
    .single();

  return profile?.owner_id || userId;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;
    const effectiveUserId = await getEffectiveUserId(userId, effectiveProfileId);

    // Get problems for this user
    const { data: problems } = await supabase
      .from("problems")
      .select("id, difficulty, type, solved_at, created_at, time_spent, student_profile_id")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false });

    // Filter by profile
    const filteredProblems = (problems || []).filter((p: any) =>
      effectiveProfileId
        ? p.student_profile_id === effectiveProfileId || p.student_profile_id === null
        : p.student_profile_id === null
    );

    // Get XP history
    const { data: xpHistory } = await supabase
      .from("xp")
      .select("total_xp, updated_at, student_profile_id")
      .eq("user_id", effectiveUserId);

    const filteredXP = (xpHistory || []).filter((x: any) =>
      effectiveProfileId
        ? x.student_profile_id === effectiveProfileId || x.student_profile_id === null
        : x.student_profile_id === null
    );

    // Generate daily activity for last 14 days
    const dailyActivity = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayProblems = filteredProblems.filter((p: any) =>
        p.solved_at && p.solved_at.startsWith(dateStr)
      );

      dailyActivity.push({
        date: dateStr,
        problems: dayProblems.length,
        xp: dayProblems.length * 10, // Estimate XP
      });
    }

    // Problems by difficulty
    const difficultyCount: Record<string, number> = {
      elementary: 0,
      middle: 0,
      high: 0,
      advanced: 0,
    };
    filteredProblems.forEach((p: any) => {
      if (p.solved_at && p.difficulty && difficultyCount[p.difficulty] !== undefined) {
        difficultyCount[p.difficulty]++;
      }
    });
    const problemsByDifficulty = Object.entries(difficultyCount).map(([difficulty, count]) => ({
      difficulty,
      count,
    }));

    // Problems by type
    const typeCount: Record<string, number> = {};
    filteredProblems.forEach((p: any) => {
      if (p.solved_at && p.type) {
        typeCount[p.type] = (typeCount[p.type] || 0) + 1;
      }
    });
    const problemsByType = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
    }));

    // Weekly trend (last 4 weeks)
    const weeklyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const weekProblems = filteredProblems.filter((p: any) => {
        if (!p.solved_at) return false;
        const solvedDate = new Date(p.solved_at);
        return solvedDate >= weekStart && solvedDate <= weekEnd;
      });

      const avgTime = weekProblems.length > 0
        ? weekProblems.reduce((sum: number, p: any) => sum + (p.time_spent || 0), 0) / weekProblems.length
        : 0;

      weeklyTrend.push({
        week: `Week ${4 - i}`,
        problems: weekProblems.length,
        avgTime: Math.round(avgTime / 60), // Convert to minutes
      });
    }

    // Recent activity
    const recentActivity = filteredProblems
      .filter((p: any) => p.solved_at)
      .slice(0, 10)
      .map((p: any) => ({
        date: p.solved_at,
        action: "Solved problem",
        details: `${p.type?.replace(/_/g, " ") || "Problem"} (${p.difficulty || "unknown"})`,
      }));

    const analytics = {
      dailyActivity,
      problemsByDifficulty,
      problemsByType,
      weeklyTrend,
      recentActivity,
    };

    logger.debug("Student analytics generated", {
      userId: effectiveUserId,
      profileId: effectiveProfileId,
      totalProblems: filteredProblems.length,
    });

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    logger.error("Error in GET /api/v2/student-analytics", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
