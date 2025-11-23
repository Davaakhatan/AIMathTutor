/**
 * Problem Update API v2 - Update problem properties like bookmarks
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

// Create admin client for server-side operations
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
};

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, problemId, updates } = body;

    if (!userId || !problemId) {
      return NextResponse.json({ success: false, error: "userId and problemId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.warn("Supabase admin not available for problem update");
      return NextResponse.json({
        success: false,
        error: "Database not configured"
      }, { status: 503 });
    }

    // Map frontend field names to database column names
    const dbUpdates: Record<string, any> = {};
    if (updates.is_bookmarked !== undefined) {
      dbUpdates.is_bookmarked = updates.is_bookmarked;
    }
    if (updates.difficulty !== undefined) {
      dbUpdates.difficulty = updates.difficulty;
    }
    if (updates.hints_used !== undefined) {
      dbUpdates.hints_used = updates.hints_used;
    }

    const { data, error } = await supabase
      .from("problems")
      .update(dbUpdates)
      .eq("id", problemId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating problem", { error, userId, problemId });
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    logger.info("Problem updated successfully", { userId, problemId, updates: dbUpdates });

    return NextResponse.json({
      success: true,
      problem: data
    });
  } catch (error) {
    logger.error("Error in PATCH /api/v2/problems/update", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
