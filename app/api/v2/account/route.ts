/**
 * Account API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteAccount } from "@/backend/services/accountService";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized - no user session" }, { status: 401 });
    }

    const result = await deleteAccount(user.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Account and all related data deleted successfully",
      });
    }

    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  } catch (error) {
    logger.error("Error in DELETE /api/v2/account", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
