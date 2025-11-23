/**
 * Notifications API v2 - Uses backend services
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

// Create admin client for server-side operations
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.warn("Supabase admin not available for notifications");
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
        message: "Database not configured"
      });
    }

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching notifications", { error, userId });
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    const notifications = (data || []).map((n: any) => ({
      id: n.id,
      type: n.notification_type,
      title: n.title,
      message: n.message,
      timestamp: new Date(n.created_at).getTime(),
      read: n.is_read,
      actionUrl: n.action_url,
      metadata: n.metadata,
    }));

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: unreadCount || 0
    });
  } catch (error) {
    logger.error("Error in GET /api/v2/notifications", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, notificationId, type, title, message, metadata } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.warn("Supabase admin not available for notifications");
      // Return success anyway - localStorage will handle it
      return NextResponse.json({
        success: true,
        message: "Database not configured, using local storage"
      });
    }

    // Mark notification as read
    if (action === "markRead" && notificationId) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        logger.warn("Error marking notification as read (table may not exist)", { error: error.message });
        // Return success anyway - localStorage handles it
        return NextResponse.json({ success: true, message: "Using local storage" });
      }

      return NextResponse.json({ success: true });
    }

    // Mark all as read
    if (action === "markAllRead") {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        logger.warn("Error marking all notifications as read (table may not exist)", { error: error.message });
        // Return success anyway - localStorage handles it
        return NextResponse.json({ success: true, message: "Using local storage" });
      }

      return NextResponse.json({ success: true });
    }

    // Clear all notifications
    if (action === "clearAll") {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId);

      if (error) {
        logger.warn("Error clearing notifications (table may not exist)", { error: error.message });
        // Return success anyway - localStorage handles it
        return NextResponse.json({ success: true, message: "Using local storage" });
      }

      return NextResponse.json({ success: true });
    }

    // Create new notification
    if (!type || !title) {
      return NextResponse.json({ success: false, error: "type and title required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        notification_type: type,
        title,
        message: message || "",
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      logger.warn("Error creating notification (table may not exist)", { error: error.message });
      // Return success anyway - localStorage handles it
      return NextResponse.json({ success: true, message: "Using local storage" });
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: data.id,
        type: data.notification_type,
        title: data.title,
        message: data.message,
        timestamp: new Date(data.created_at).getTime(),
        read: data.is_read,
      }
    });
  } catch (error) {
    logger.error("Error in POST /api/v2/notifications", { error });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
