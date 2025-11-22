/**
 * Learning Paths API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLearningPath,
  saveLearningPath,
  deleteLearningPath,
} from "@/backend/services/learningPathsService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const result = await getLearningPath(userId, profileId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/learning-paths", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, path } = body;

    if (!userId || !path) {
      return NextResponse.json({ success: false, error: "userId and path required" }, { status: 400 });
    }

    const result = await saveLearningPath(userId, path, profileId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/learning-paths", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const result = await deleteLearningPath(userId, profileId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in DELETE /api/v2/learning-paths", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
