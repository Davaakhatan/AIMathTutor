/**
 * Student Alerts API - Quick stats for profile switcher
 * Returns alert status for each student profile
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

interface StudentAlert {
  profileId: string;
  hasAlert: boolean;
  alertType?: "inactivity" | "streak_lost" | "low_accuracy" | "goal_achieved";
  message?: string;
  daysInactive?: number;
  streak?: number;
}

// Helper to get the actual user_id for a student profile (owner_id)
async function getEffectiveUserId(supabase: any, profileId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from("student_profiles")
    .select("owner_id")
    .eq("id", profileId)
    .single();

  return profile?.owner_id || null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileIds = searchParams.get("profileIds")?.split(",").filter(Boolean);

    if (!userId || !profileIds?.length) {
      return NextResponse.json(
        { success: false, error: "userId and profileIds required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const alerts: StudentAlert[] = [];
    const now = new Date();

    for (const profileId of profileIds) {
      // Get the actual user_id for the student profile (owner_id)
      const effectiveUserId = await getEffectiveUserId(supabase, profileId);
      const queryUserId = effectiveUserId || userId;

      // Get XP data for this profile
      const { data: xpData } = await supabase
        .from("user_xp")
        .select("current_streak, last_activity_at, total_xp")
        .eq("user_id", queryUserId)
        .eq("profile_id", profileId)
        .single();

      // Get recent problem history
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: history } = await supabase
        .from("problem_history")
        .select("is_correct, created_at")
        .eq("user_id", queryUserId)
        .eq("student_profile_id", profileId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      // Calculate days inactive
      let daysInactive = 0;
      if (xpData?.last_activity_at) {
        const lastActive = new Date(xpData.last_activity_at);
        daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      } else if (!history?.length) {
        daysInactive = 999; // Never active
      }

      // Calculate accuracy
      const correctCount = history?.filter((h: { is_correct: boolean }) => h.is_correct).length || 0;
      const totalCount = history?.length || 0;
      const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 100;

      // Determine alert
      let alert: StudentAlert = {
        profileId,
        hasAlert: false,
        streak: xpData?.current_streak || 0,
        daysInactive,
      };

      // Priority: inactivity > streak_lost > low_accuracy
      if (daysInactive >= 3) {
        alert = {
          ...alert,
          hasAlert: true,
          alertType: "inactivity",
          message: daysInactive >= 7
            ? `Inactive for ${daysInactive} days`
            : `${daysInactive} days since last practice`,
        };
      } else if (xpData?.current_streak === 0 && totalCount > 5) {
        alert = {
          ...alert,
          hasAlert: true,
          alertType: "streak_lost",
          message: "Streak lost - needs encouragement",
        };
      } else if (accuracy < 50 && totalCount >= 5) {
        alert = {
          ...alert,
          hasAlert: true,
          alertType: "low_accuracy",
          message: `${Math.round(accuracy)}% accuracy - may need help`,
        };
      }

      alerts.push(alert);
    }

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error) {
    logger.error("Error in student-alerts API", { error });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
