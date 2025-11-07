import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to get profile name by profile ID
 * GET /api/get-profile-name?profileId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("student_profiles")
      .select("name")
      .eq("id", profileId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        );
      }
      logger.error("Error fetching profile name", { error: error.message, profileId });
      return NextResponse.json(
        { error: "Failed to fetch profile name", details: error.message },
        { status: 500 }
      );
    }

    type ProfileData = { name: string } | null;
    const typedData = data as ProfileData;

    if (!typedData) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      name: typedData.name,
    });
  } catch (error) {
    logger.error("Error in get-profile-name route", { error });
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

