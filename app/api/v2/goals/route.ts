/**
 * Goals API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
} from "@/backend/services/goalsService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const status = searchParams.get("status") as "active" | "completed" | "paused" | "cancelled" | null;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const result = await getGoals(userId, profileId, status || undefined);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/goals", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, goal_type, target_subject, target_date, metadata } = body;

    if (!userId || !goal_type || !target_subject) {
      return NextResponse.json(
        { success: false, error: "userId, goal_type, and target_subject required" },
        { status: 400 }
      );
    }

    const result = await createGoal(userId, profileId, {
      goal_type,
      target_subject,
      target_date: target_date || null,
      metadata: metadata || {},
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/goals", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, goalId, action, progress, status, target_date, metadata } = body;

    if (!userId || !goalId) {
      return NextResponse.json({ success: false, error: "userId and goalId required" }, { status: 400 });
    }

    // Complete goal shortcut
    if (action === "complete") {
      const result = await completeGoal(userId, goalId);
      return NextResponse.json(result);
    }

    // Regular update
    const updateInput: any = {};
    if (progress !== undefined) updateInput.progress = progress;
    if (status !== undefined) updateInput.status = status;
    if (target_date !== undefined) updateInput.target_date = target_date;
    if (metadata !== undefined) updateInput.metadata = metadata;

    const result = await updateGoal(userId, goalId, updateInput);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in PUT /api/v2/goals", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const goalId = searchParams.get("goalId");

    if (!userId || !goalId) {
      return NextResponse.json({ success: false, error: "userId and goalId required" }, { status: 400 });
    }

    const result = await deleteGoal(userId, goalId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in DELETE /api/v2/goals", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
