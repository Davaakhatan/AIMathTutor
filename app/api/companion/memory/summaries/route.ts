import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { getSummaries, getSummariesByConcept } from "@/services/conversationSummaryService";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * API route to get conversation summaries
 * GET /api/companion/memory/summaries?userId=xxx&profileId=xxx&concept=xxx&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const concept = searchParams.get("concept");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
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

    // Get summaries by concept if concept is provided, otherwise get all
    const summaries = concept
      ? await getSummariesByConcept(userId, concept, profileId || null, limit)
      : await getSummaries(userId, profileId || null, limit);

    return NextResponse.json({
      success: true,
      summaries,
    });
  } catch (error) {
    logger.error("Error in companion/memory/summaries route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

