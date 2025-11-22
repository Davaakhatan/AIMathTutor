/**
 * Profiles API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getProfile,
  updateProfile,
  ensureProfileExists,
  getStudentProfiles,
  createStudentProfile,
  updateStudentProfile,
  deleteStudentProfile
} from "@/backend/services/profilesService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    // Get student profiles
    if (action === "studentProfiles") {
      const result = await getStudentProfiles(userId);
      return NextResponse.json(result);
    }

    // Get main profile (default)
    const result = await getProfile(userId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/profiles", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, profileId, ...data } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    // Ensure profile exists
    if (action === "ensure") {
      const result = await ensureProfileExists(userId, data.role || "student");
      return NextResponse.json(result);
    }

    // Create student profile
    if (action === "createStudent") {
      if (!data.name) {
        return NextResponse.json({ success: false, error: "name required" }, { status: 400 });
      }
      const result = await createStudentProfile(userId, data.name, data.gradeLevel, data.school);
      return NextResponse.json(result);
    }

    // Update student profile
    if (action === "updateStudent") {
      if (!profileId) {
        return NextResponse.json({ success: false, error: "profileId required" }, { status: 400 });
      }
      const result = await updateStudentProfile(userId, profileId, data);
      return NextResponse.json(result);
    }

    // Update main profile (default)
    const result = await updateProfile(userId, data);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/profiles", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId || !profileId) {
      return NextResponse.json({ success: false, error: "userId and profileId required" }, { status: 400 });
    }

    const result = await deleteStudentProfile(userId, profileId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in DELETE /api/v2/profiles", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
