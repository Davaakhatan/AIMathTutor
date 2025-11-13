import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * GET /api/problems
 * Fetch problems for the current user
 * Uses server-side client to bypass RLS issues
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
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

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.debug("Fetching problems via API", { userId, effectiveProfileId, limit });

    let query = supabase
      .from("problems")
      .select("*");

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.eq("user_id", userId).is("student_profile_id", null);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching problems via API", {
        error: error.message,
        userId,
        effectiveProfileId,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    logger.debug("Problems fetched via API", {
      count: data?.length || 0,
      userId,
      effectiveProfileId,
    });

    // Map to ProblemData format
    const problems = (data || []).map((p: any) => ({
      id: p.id,
      text: p.text,
      type: p.type,
      difficulty: p.difficulty,
      image_url: p.image_url,
      parsed_data: p.parsed_data,
      is_bookmarked: p.is_bookmarked || false,
      is_generated: p.is_generated || false,
      source: p.source,
      solved_at: p.solved_at,
      created_at: p.created_at,
      attempts: p.attempts || 0,
      hints_used: p.hints_used || 0,
      time_spent: p.time_spent || 0,
    }));

    return NextResponse.json({ success: true, problems });
  } catch (error) {
    logger.error("Exception fetching problems via API", { error });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

