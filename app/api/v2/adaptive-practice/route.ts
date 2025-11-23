/**
 * Adaptive Practice API
 * GET: Generate personalized practice session
 * POST: Get detailed performance analysis
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateAdaptivePractice,
  getUserPerformanceAnalysis,
} from "@/backend/services/adaptivePracticeService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const sessionType = searchParams.get("sessionType") as
      | "weakness"
      | "strength"
      | "balanced"
      | "challenge"
      | null;
    const count = parseInt(searchParams.get("count") || "5", 10);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const session = await generateAdaptivePractice(
      userId,
      profileId,
      sessionType || "balanced",
      Math.min(Math.max(count, 1), 10) // Limit 1-10 problems
    );

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Error generating adaptive practice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate practice session" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const analysis = await getUserPerformanceAnalysis(userId, profileId);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Error getting performance analysis:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get performance analysis" },
      { status: 500 }
    );
  }
}
