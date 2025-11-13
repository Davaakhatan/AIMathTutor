import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import {
  createGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "@/services/goalService";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * API route for learning goals
 * GET /api/companion/goals - List goals
 * POST /api/companion/goals - Create goal
 * PUT /api/companion/goals - Update goal
 * DELETE /api/companion/goals - Delete goal
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const status = searchParams.get("status") as "active" | "completed" | "paused" | "cancelled" | null;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Verify user exists in profiles table (simpler check for service role client)
    const supabase = getSupabaseServer();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      logger.warn("User not found in profiles", { userId, error: profileError });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const goals = await getGoals(userId, profileId || null, status || undefined);

    return NextResponse.json({
      success: true,
      goals,
    });
  } catch (error) {
    logger.error("Error in companion/goals GET route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, goal_type, target_subject, target_date, metadata } = body;

    if (!userId || !goal_type || !target_subject) {
      return NextResponse.json(
        { error: "userId, goal_type, and target_subject are required" },
        { status: 400 }
      );
    }

    // Verify user exists in profiles table (simpler check for service role client)
    const supabase = getSupabaseServer();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      logger.warn("User not found in profiles", { userId, error: profileError });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const goal = await createGoal(userId, profileId || null, {
      goal_type,
      target_subject,
      target_date: target_date || null,
      metadata: metadata || {},
    });

    if (!goal) {
      logger.error("createGoal returned null", { userId, profileId, goal_type, target_subject });
      return NextResponse.json(
        { error: "Failed to create goal. Check server logs for details." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      goal,
    });
  } catch (error) {
    logger.error("Error in companion/goals POST route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, goalId, progress, status, target_date, metadata } = body;

    if (!userId || !goalId) {
      return NextResponse.json(
        { error: "userId and goalId are required" },
        { status: 400 }
      );
    }

    // Verify user exists in profiles table (simpler check for service role client)
    const supabase = getSupabaseServer();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      logger.warn("User not found in profiles", { userId, error: profileError });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const updateInput: UpdateGoalInput = {};
    if (progress !== undefined) updateInput.progress = progress;
    if (status !== undefined) updateInput.status = status;
    if (target_date !== undefined) updateInput.target_date = target_date;
    if (metadata !== undefined) updateInput.metadata = metadata;

    const goal = await updateGoal(userId, goalId, updateInput);

    if (!goal) {
      return NextResponse.json(
        { error: "Failed to update goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      goal,
    });
  } catch (error) {
    logger.error("Error in companion/goals PUT route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const goalId = searchParams.get("goalId");

    if (!userId || !goalId) {
      return NextResponse.json(
        { error: "userId and goalId are required" },
        { status: 400 }
      );
    }

    // Verify user exists in profiles table (simpler check for service role client)
    const supabase = getSupabaseServer();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      logger.warn("User not found in profiles", { userId, error: profileError });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const success = await deleteGoal(userId, goalId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error("Error in companion/goals DELETE route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

