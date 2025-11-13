import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to fetch user emails for leaderboard
 * This is needed because we can't query auth.users directly from the client
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get("userIds");

    if (!userIdsParam) {
      return NextResponse.json({ success: false, error: "userIds required" }, { status: 400 });
    }

    const userIds = userIdsParam.split(",").filter(id => id.trim());

    if (userIds.length === 0) {
      return NextResponse.json({ success: false, error: "No valid userIds provided" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    // Query auth.users via RPC or direct query
    // Since we can't directly query auth.users, we'll use a workaround
    // We'll query the profiles table and try to get emails from there if available
    // For now, we'll use a server-side admin query to get emails
    
    // Use admin client to query auth.users via SQL
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const adminSupabase = getSupabaseAdmin();
    
    if (!adminSupabase) {
      logger.warn("Admin client not available for email lookup");
      return NextResponse.json({ success: false, error: "Admin client not configured" }, { status: 500 });
    }

    const emails: Record<string, string> = {};

    try {
      // Query auth.users directly via SQL using admin client
      // Build SQL query with user IDs - use proper parameterization
      const userIdsStr = userIds.map(id => `'${id}'`).join(', ');
      const query = `
        SELECT id, email 
        FROM auth.users 
        WHERE id IN (${userIdsStr})
      `;
      
      // Use execute SQL via admin client (if available) or fallback to admin API
      // Note: Supabase JS client doesn't have direct SQL execution, so we'll use admin API
      for (const userId of userIds) {
        try {
          // Query auth.users via admin API
          const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
          if (!userError && userData?.user?.email) {
            emails[userId] = userData.user.email;
          }
        } catch (err) {
          logger.warn(`Failed to get email for user ${userId}`, { error: err });
        }
      }
    } catch (error) {
      logger.error("Error fetching user emails", { error });
    }

    logger.debug("Fetched emails for leaderboard", { count: Object.keys(emails).length, userIds: userIds.length });

    return NextResponse.json({ 
      success: true, 
      emails: emails 
    });
  } catch (error) {
    logger.error("Exception in GET /api/leaderboard/emails", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

