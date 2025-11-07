import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { completeGoal } from "@/services/goalService";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * API route to complete a goal
 * POST /api/companion/goals/[id]/complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    const body = await request.json();
    const { userId } = body;

    if (!userId || !goalId) {
      return NextResponse.json(
        { error: "userId and goalId are required" },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const goal = await completeGoal(userId, goalId);

    if (!goal) {
      return NextResponse.json(
        { error: "Failed to complete goal" },
        { status: 500 }
      );
    }

    // Emit goal_achieved event
    const { eventBus } = await import("@/lib/eventBus");
    await eventBus.emit({
      type: "goal_achieved",
      userId,
      profileId: goal.student_profile_id || undefined,
      data: {
        goalId: goal.id,
        goalType: goal.goal_type,
        targetSubject: goal.target_subject,
        progress: goal.progress,
      },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      goal,
    });
  } catch (error) {
    logger.error("Error in companion/goals/[id]/complete route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

