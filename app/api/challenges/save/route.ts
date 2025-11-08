import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * Save challenge to database
 * POST /api/challenges/save
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      challenge_text,
      challenge_type,
      problem_type,
      difficulty,
      share_code,
      share_id,
      challenger_id,
      is_completed,
      solved_at,
      attempts,
      hints_used,
      time_spent,
      metadata,
    } = body;

    if (!challenge_text) {
      return NextResponse.json(
        { success: false, error: "Missing challenge_text" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 500 }
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Guest user - don't save to database
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // Get active profile (if any)
    let profileId: string | null = null;
    try {
      const { data: profiles } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);
      
      if (profiles && profiles.length > 0) {
        profileId = (profiles[0] as any).id;
      }
    } catch (e) {
      // Ignore profile lookup errors
    }

    const insertData: any = {
      user_id: user.id,
      challenge_text,
      challenge_type: challenge_type || "generated",
      problem_type: problem_type || null,
      difficulty: difficulty || null,
      share_code: share_code || null,
      share_id: share_id || null,
      challenger_id: challenger_id || null,
      is_completed: is_completed || false,
      solved_at: solved_at || (is_completed ? new Date().toISOString() : null),
      attempts: attempts || 0,
      hints_used: hints_used || 0,
      time_spent: time_spent || 0,
      metadata: metadata || {},
    };

    if (profileId) {
      insertData.student_profile_id = profileId;
    }

    const { data, error } = await supabase
      .from("challenges")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error("Error saving challenge", { error: error.message, userId: user.id });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    logger.info("Challenge saved successfully", { challengeId: (data as any).id, userId: user.id });
    return NextResponse.json({ success: true, challenge: data });
  } catch (error) {
    logger.error("Error in POST /api/challenges/save", { error });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

