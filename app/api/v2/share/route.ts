/**
 * Share API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateShare,
  getShare,
  trackShareClick,
  trackShareConversion,
} from "@/backend/services/shareService";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareCode = searchParams.get("shareCode");

    if (!shareCode) {
      return NextResponse.json({ success: false, error: "shareCode required" }, { status: 400 });
    }

    const result = await getShare(shareCode);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/share", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, shareType, metadata, studentProfileId, expiresInDays, shareCode } = body;

    // Track click
    if (action === "trackClick") {
      if (!shareCode) {
        return NextResponse.json({ success: false, error: "shareCode required" }, { status: 400 });
      }
      const result = await trackShareClick(shareCode);
      return NextResponse.json(result);
    }

    // Track conversion
    if (action === "trackConversion") {
      if (!shareCode) {
        return NextResponse.json({ success: false, error: "shareCode required" }, { status: 400 });
      }
      const result = await trackShareConversion(shareCode);
      return NextResponse.json(result);
    }

    // Generate share (default)
    if (!userId || !shareType) {
      return NextResponse.json({ success: false, error: "userId and shareType required" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
    const result = await generateShare(
      userId,
      shareType,
      metadata,
      studentProfileId,
      expiresInDays,
      origin
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/share", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
