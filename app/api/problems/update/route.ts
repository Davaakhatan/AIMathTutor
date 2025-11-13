import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * PATCH /api/problems/update
 * Update a problem (e.g., toggle bookmark)
 * Uses server-side client to bypass RLS issues
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, problemId, updates } = body;

    if (!userId || !problemId || !updates) {
      return NextResponse.json(
        { success: false, error: "userId, problemId, and updates required" },
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

    logger.debug("Updating problem via API", { userId, problemId, updates });

    const { error } = await (supabase as any)
      .from("problems")
      .update({
        ...(updates as any),
        updated_at: new Date().toISOString(),
      })
      .eq("id", problemId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Error updating problem via API", {
        error: error.message,
        userId,
        problemId,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    logger.debug("Problem updated successfully via API", { userId, problemId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Exception updating problem via API", { error });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

