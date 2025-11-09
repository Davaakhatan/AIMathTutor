import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * Test endpoint for Streak system
 * Tests: Create, Read, Update streaks
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .is("student_profile_id", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      streakData: data && data.length > 0 ? data[0] : null,
      count: data?.length || 0,
    });
  } catch (error) {
    logger.error("Error in GET /api/test/streak", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, streak, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const today = new Date().toISOString().split("T")[0];

    if (action === "increment") {
      // Try update first
      const { data: updated, error: updateError } = await supabase
        .from("streaks")
        .update({
          current_streak: streak || 1,
          longest_streak: streak || 1,
          last_study_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .is("student_profile_id", null)
        .select();

      // If no rows updated, insert
      if (!updated || updated.length === 0) {
        const { data: inserted, error: insertError } = await supabase
          .from("streaks")
          .insert({
            user_id: userId,
            student_profile_id: null,
            current_streak: streak || 1,
            longest_streak: streak || 1,
            last_study_date: today,
          })
          .select();

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: "Streak record created",
          streakData: inserted[0],
        });
      }

      return NextResponse.json({
        success: true,
        message: "Streak updated",
        streakData: updated[0],
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Error in POST /api/test/streak", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

