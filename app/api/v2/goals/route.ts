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
  getGoalAnalytics,
  createGoalFromTemplate,
  goalTemplates,
} from "@/backend/services/goalsService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const status = searchParams.get("status") as "active" | "completed" | "paused" | "cancelled" | null;
    const action = searchParams.get("action");

    // Return templates (no auth required)
    if (action === "templates") {
      return NextResponse.json({ success: true, templates: goalTemplates });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    // Return analytics
    if (action === "analytics") {
      const result = await getGoalAnalytics(userId, profileId);
      return NextResponse.json(result);
    }

    // Default: return goals
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
    const { userId, profileId, goal_type, target_subject, target_date, metadata, templateId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    // Create from template
    if (templateId) {
      const result = await createGoalFromTemplate(userId, profileId, templateId);
      return NextResponse.json(result);
    }

    // Create custom goal
    if (!goal_type || !target_subject) {
      return NextResponse.json(
        { success: false, error: "goal_type and target_subject required for custom goals" },
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
