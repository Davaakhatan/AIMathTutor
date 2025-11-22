/**
 * Share Backend Service
 * Handles all share link database operations
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

// Types
interface Share {
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
}

/**
 * Generate a share link
 */
export async function generateShare(
  userId: string,
  shareType: string,
  metadata?: Record<string, any>,
  studentProfileId?: string | null,
  expiresInDays?: number,
  origin?: string
): Promise<{ success: boolean; share?: Share; shareUrl?: string; deepLinkUrl?: string; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

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

      if (!existing) break;
      shareCode = generateShareCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      logger.error("Failed to generate unique share code after max attempts");
      return { success: false, error: "Failed to generate unique share code" };
    }

    // Calculate expiration date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert share record
    const { data, error } = await (supabase as any)
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
      return { success: false, error: error.message };
    }

    // Generate share URLs
    const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || "";
    const shareUrl = `${baseUrl}/share/${shareCode}`;
    const deepLinkUrl = `${baseUrl}/s/${shareCode}`;

    logger.info("Share created successfully", { shareCode, shareType, userId });

    return {
      success: true,
      share: data as Share,
      shareUrl,
      deepLinkUrl,
    };
  } catch (error) {
    logger.error("Error in generateShare", { error, userId, shareType });
    return { success: false, error: String(error) };
  }
}

/**
 * Get share by code
 */
export async function getShare(shareCode: string): Promise<{ success: boolean; share?: Share; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { data, error } = await supabase
      .from("shares")
      .select("*")
      .eq("share_code", shareCode)
      .single();

    if (error) {
      logger.error("Error fetching share", { error: error.message, shareCode });
      return { success: false, error: error.message };
    }

    return { success: true, share: data as Share };
  } catch (error) {
    logger.error("Error in getShare", { error, shareCode });
    return { success: false, error: String(error) };
  }
}

/**
 * Track share click
 */
export async function trackShareClick(shareCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { data: share } = await supabase
      .from("shares")
      .select("click_count")
      .eq("share_code", shareCode)
      .single();

    if (!share) {
      return { success: false, error: "Share not found" };
    }

    const { error } = await (supabase as any)
      .from("shares")
      .update({
        click_count: ((share as any).click_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("share_code", shareCode);

    if (error) {
      logger.error("Error tracking share click", { error: error.message, shareCode });
      return { success: false, error: error.message };
    }

    logger.debug("Share click tracked", { shareCode });

    return { success: true };
  } catch (error) {
    logger.error("Error in trackShareClick", { error, shareCode });
    return { success: false, error: String(error) };
  }
}

/**
 * Track share conversion
 */
export async function trackShareConversion(shareCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { data: share } = await supabase
      .from("shares")
      .select("conversion_count")
      .eq("share_code", shareCode)
      .single();

    if (!share) {
      return { success: false, error: "Share not found" };
    }

    const { error } = await (supabase as any)
      .from("shares")
      .update({
        conversion_count: ((share as any).conversion_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("share_code", shareCode);

    if (error) {
      logger.error("Error tracking share conversion", { error: error.message, shareCode });
      return { success: false, error: error.message };
    }

    logger.debug("Share conversion tracked", { shareCode });

    return { success: true };
  } catch (error) {
    logger.error("Error in trackShareConversion", { error, shareCode });
    return { success: false, error: String(error) };
  }
}
