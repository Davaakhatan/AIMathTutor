import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { summarizeSession } from "@/services/conversationSummaryService";
import type { Message } from "@/types";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * API route to generate and store a conversation summary
 * POST /api/companion/memory/summarize
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, sessionId, messages, problemText, problemType, difficultyLevel, hintsUsed, timeSpent, attempts } = body;

    if (!userId || !sessionId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "userId, sessionId, and messages array are required" },
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

    // Generate summary
    const summary = await summarizeSession(
      userId,
      profileId || null,
      sessionId,
      {
        messages: messages as Message[],
        problemText,
        problemType,
        difficultyLevel,
        hintsUsed,
        timeSpent,
        attempts,
      }
    );

    if (!summary) {
      return NextResponse.json(
        { error: "Failed to generate summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error("Error in companion/memory/summarize route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

