import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * Test endpoint for XP system
 * Tests: Create, Read, Update, Delete XP records
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

    // Get XP data for user
    const { data, error } = await supabase
      .from("xp_data")
      .select("*")
      .eq("user_id", userId)
      .is("student_profile_id", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      xpData: data && data.length > 0 ? data[0] : null,
      count: data?.length || 0,
    });
  } catch (error) {
    logger.error("Error in GET /api/test/xp", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, xp, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Action: create
    if (action === "create" || !action) {
      const { data, error } = await supabase
        .from("xp_data")
        .insert({
          user_id: userId,
          student_profile_id: null,
          total_xp: xp || 0,
          level: 1,
          xp_to_next_level: 100,
          xp_history: [],
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "XP record created",
        xpData: data,
      });
    }

    // Action: update
    if (action === "update") {
      // Try update first
      const { data: updated, error: updateError } = await supabase
        .from("xp_data")
        .update({
          total_xp: xp,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .is("student_profile_id", null)
        .select();

      // If no rows updated, insert
      if (!updated || updated.length === 0) {
        const { data: inserted, error: insertError } = await supabase
          .from("xp_data")
          .insert({
            user_id: userId,
            student_profile_id: null,
            total_xp: xp,
            level: 1,
            xp_to_next_level: 100,
          })
          .select();

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: "XP record inserted (none existed)",
          xpData: inserted[0],
        });
      }

      return NextResponse.json({
        success: true,
        message: "XP record updated",
        xpData: updated[0],
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Error in POST /api/test/xp", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { error } = await supabase
      .from("xp_data")
      .delete()
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "XP record deleted",
    });
  } catch (error) {
    logger.error("Error in DELETE /api/test/xp", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

