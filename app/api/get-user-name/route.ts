import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

// Force dynamic rendering (this route uses request.url)
export const dynamic = 'force-dynamic';

/**
 * API route to get user name by user ID
 * GET /api/get-user-name?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Try to get name from student_profiles first (if user has a profile)
    const { data: profileData } = await supabase
      .from("student_profiles")
      .select("name")
      .eq("owner_id", userId)
      .limit(1)
      .single();

    type ProfileData = { name: string } | null;
    const typedProfileData = profileData as ProfileData;

    if (typedProfileData?.name) {
      return NextResponse.json({
        success: true,
        name: typedProfileData.name,
      });
    }

    // Fallback: try to get email from auth.users (via admin)
    // Note: This requires admin access, so we'll just return a generic name
    return NextResponse.json({
      success: true,
      name: null, // Could not determine name
    });
  } catch (error) {
    logger.error("Error in get-user-name route", { error });
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

