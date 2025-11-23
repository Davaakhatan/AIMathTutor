/**
 * Re-engagement Nudges API
 * GET: Get personalized nudges for a user
 */

import { NextRequest, NextResponse } from "next/server";
import { generateReengagementNudges } from "@/backend/services/reengagementService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const nudges = await generateReengagementNudges(userId, profileId);

    return NextResponse.json({
      success: true,
      data: nudges,
    });
  } catch (error) {
    console.error("Error getting nudges:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get nudges" },
      { status: 500 }
    );
  }
}
