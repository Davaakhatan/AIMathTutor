import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to generate a share link
 * POST /api/share/generate
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, shareType, metadata, studentProfileId, expiresInDays } = await request.json();

    if (!userId || !shareType) {
      return NextResponse.json(
        { error: "userId and shareType are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Generate unique share code
    const generateShareCode = (): string => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let shareCode = generateShareCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure uniqueness
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("shares")
        .select("id")
        .eq("share_code", shareCode)
        .single();

      if (!existing) {
        break; // Code is unique
      }

      shareCode = generateShareCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      logger.error("Failed to generate unique share code after max attempts");
      return NextResponse.json(
        { error: "Failed to generate unique share code" },
        { status: 500 }
      );
    }

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert share record
    const { data, error } = await supabase
      .from("shares")
      .insert({
        user_id: userId,
        student_profile_id: studentProfileId || null,
        share_type: shareType,
        share_code: shareCode,
        metadata: metadata || {},
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating share", { error: error.message, userId, shareType });
      return NextResponse.json(
        { error: "Failed to create share", details: error.message },
        { status: 500 }
      );
    }

    type ShareData = {
      id: string;
      user_id: string;
      student_profile_id: string | null;
      share_type: string;
      share_code: string;
      metadata: Record<string, any>;
      click_count: number;
      conversion_count: number;
      created_at: string;
      expires_at: string | null;
    };

    const typedData = data as ShareData | null;

    if (!typedData) {
      logger.error("Share created but data is null", { shareCode });
      return NextResponse.json(
        { error: "Share created but failed to retrieve data" },
        { status: 500 }
      );
    }

    // Generate share URLs
    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
    const shareUrl = `${baseUrl}/share/${shareCode}`;
    const deepLinkUrl = `${baseUrl}/s/${shareCode}`;

    logger.info("Share created successfully", { shareCode, shareType, userId });

    return NextResponse.json({
      success: true,
      share: typedData,
      shareUrl,
      deepLinkUrl,
    });
  } catch (error) {
    logger.error("Error in share/generate route", { error });
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

