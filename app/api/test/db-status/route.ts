import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * Database status endpoint
 * Shows all tables and their row counts
 */

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // List of all expected tables
    const tables = [
      // Core
      "profiles",
      "student_profiles",
      "profile_relationships",
      
      // Tutoring
      "problems",
      "sessions",
      "daily_problems",
      "daily_problems_completion",
      
      // Gamification
      "xp_data",
      "streaks",
      "achievements",
      "leaderboard",
      
      // Viral/Social
      "referral_codes",
      "referrals",
      "challenges",
      "shares",
      
      // Companion
      "learning_goals",
      "conversation_summaries",
      "study_sessions",
      "daily_goals",
      "concept_mastery",
      "activity_events",
      
      // Supporting
      "analytics_events",
      "notifications",
      "reminders",
      "study_materials",
      "practice_problems",
      "tips",
      "formulas",
      "badges",
      "user_badges",
      "study_groups",
      "study_group_members",
      "forum_posts",
      "forum_replies",
      "messages",
    ];

    const results: Record<string, any> = {};

    // Check each table
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          results[table] = { status: "error", error: error.message };
        } else {
          results[table] = { status: "exists", count: count || 0 };
        }
      } catch (err) {
        results[table] = { status: "missing", error: String(err) };
      }
    }

    // Count by status
    const summary = {
      total: tables.length,
      exists: Object.values(results).filter((r: any) => r.status === "exists").length,
      missing: Object.values(results).filter((r: any) => r.status === "missing").length,
      errors: Object.values(results).filter((r: any) => r.status === "error").length,
    };

    // Get total records across all tables
    const totalRecords = Object.values(results)
      .filter((r: any) => r.status === "exists")
      .reduce((sum: number, r: any) => sum + (r.count || 0), 0);

    return NextResponse.json({
      success: true,
      summary: {
        ...summary,
        totalRecords,
        readyForTesting: summary.exists >= 20, // Need at least 20 core tables
      },
      tables: results,
    });
  } catch (error) {
    logger.error("Error in GET /api/test/db-status", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

