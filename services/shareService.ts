/**
 * Share Service
 * Handles share link generation, tracking, and analytics
 */

import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface ShareMetadata {
  achievement_type?: string;
  achievement_title?: string;
  problem_text?: string;
  problem_type?: string;
  streak_days?: number;
  level?: number;
  xp?: number;
  challenge_id?: string;
  [key: string]: any; // Allow additional metadata
}

export interface ShareData {
  id: string;
  user_id: string;
  student_profile_id?: string | null;
  share_type: "achievement" | "progress" | "problem" | "streak" | "challenge";
  share_code: string;
  metadata: ShareMetadata;
  click_count: number;
  conversion_count: number;
  created_at: string;
  expires_at?: string | null;
}

/**
 * Generate a unique share code
 * Uses Web Crypto API for browser compatibility
 */
function generateShareCode(): string {
  // Generate a short, URL-friendly code
  // Format: 8 characters, alphanumeric
  if (typeof window !== "undefined" && window.crypto) {
    // Browser: Use Web Crypto API
    const array = new Uint8Array(4);
    window.crypto.getRandomValues(array);
    // Convert to base64url and take first 8 chars
    const base64 = btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return base64.substring(0, 8).toUpperCase();
  } else {
    // Fallback: Use timestamp + random
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return (timestamp + random).substring(0, 8);
  }
}

/**
 * Create a new share link
 * Uses API route to avoid RLS issues
 */
export async function createShare(
  userId: string,
  shareType: ShareData["share_type"],
  metadata: ShareMetadata,
  studentProfileId?: string | null,
  expiresInDays?: number
): Promise<ShareData | null> {
  try {
    // Call API route instead of direct Supabase call
    const response = await fetch("/api/share/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        shareType,
        metadata,
        studentProfileId: studentProfileId || null,
        expiresInDays,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      logger.error("Error creating share via API", { error: errorData.error, userId, shareType });
      return null;
    }

    const result = await response.json();
    if (result.success && result.share) {
      logger.info("Share created successfully", { shareCode: result.share.share_code, shareType, userId });
      return result.share as ShareData;
    }

    logger.error("API did not return successful share data", { result });
    return null;
  } catch (error) {
    logger.error("Error in createShare", { error, userId, shareType });
    return null;
  }
}

/**
 * Get share data by share code (for deep links)
 * Uses API route to avoid RLS issues
 */
export async function getShareByCode(shareCode: string): Promise<ShareData | null> {
  try {
    // Call API route instead of direct Supabase call
    const response = await fetch(`/api/share/${shareCode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        logger.debug("Share not found", { shareCode, status: response.status });
        return null; // Not found
      }
      const errorText = await response.text().catch(() => "Unknown error");
      logger.error("Error fetching share by code", { shareCode, status: response.status, errorText });
      return null;
    }
    
    let result;
    try {
      const responseText = await response.text();
      if (!responseText) {
        logger.error("Empty response from share API", { shareCode, status: response.status });
        return null;
      }
      result = JSON.parse(responseText);
    } catch (jsonError) {
      logger.error("Error parsing JSON response", { 
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        shareCode, 
        responseStatus: response.status 
      });
      return null;
    }
    
    // Defensive checks
    if (!result) {
      logger.warn("Share API returned null/undefined result", { shareCode });
      return null;
    }
    
    if (result.success !== true) {
      logger.warn("Share API returned success: false", { shareCode, result });
      return null;
    }
    
    if (!result.share || typeof result.share !== 'object') {
      logger.warn("Share API returned invalid share data", { shareCode, result });
      return null;
    }
    
    // Check if expired
    if (result.share.expires_at && new Date(result.share.expires_at) < new Date()) {
      logger.warn("Share code expired", { shareCode, expiresAt: result.share.expires_at });
      return null;
    }
    
    return result.share as ShareData;
  } catch (error) {
    // Safely extract error information
    let errorMessage = "Unknown error";
    let errorType = "Unknown";
    
    try {
      if (error instanceof Error) {
        errorMessage = error.message || String(error);
        errorType = error.constructor.name || "Error";
      } else if (error) {
        errorMessage = String(error);
        errorType = typeof error;
      }
    } catch (e) {
      // If we can't even stringify the error, just use defaults
      errorMessage = "Error object could not be serialized";
    }
    
    logger.error("Error in getShareByCode", { 
      error: errorMessage,
      errorType: errorType,
      shareCode 
    });
    return null;
  }
}

/**
 * Track a share click (increment click_count)
 * Note: This should be called via API route to avoid RLS issues
 */
export async function trackShareClick(shareCode: string): Promise<boolean> {
  try {
    // Call API route instead of direct Supabase call
    const response = await fetch("/api/share/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareCode }),
    });
    
    if (!response.ok) {
      logger.error("Error tracking share click", { shareCode, status: response.status });
      return false;
    }
    
    logger.debug("Share click tracked", { shareCode });
    return true;
  } catch (error) {
    logger.error("Error in trackShareClick", { error, shareCode });
    return false;
  }
}

/**
 * Track a share conversion (increment conversion_count)
 * Called when someone signs up from a share link
 * Note: This should be called via API route to avoid RLS issues
 */
export async function trackShareConversion(shareCode: string, newUserId: string): Promise<boolean> {
  try {
    // Call API route instead of direct Supabase call
    const response = await fetch("/api/share/track-conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareCode, newUserId }),
    });
    
    if (!response.ok) {
      logger.error("Error tracking share conversion", { shareCode, status: response.status });
      return false;
    }
    
    logger.info("Share conversion tracked", { shareCode, newUserId });
    return true;
  } catch (error) {
    logger.error("Error in trackShareConversion", { error, shareCode });
    return false;
  }
}

/**
 * Get all shares for a user
 */
export async function getUserShares(
  userId: string,
  studentProfileId?: string | null
): Promise<ShareData[]> {
  try {
    const supabase = await getSupabaseClient();
    
    let query = supabase
      .from("shares")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (studentProfileId) {
      query = query.eq("student_profile_id", studentProfileId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error("Error fetching user shares", { error: error.message, userId });
      return [];
    }
    
    return (data || []) as ShareData[];
  } catch (error) {
    logger.error("Error in getUserShares", { error, userId });
    return [];
  }
}

/**
 * Generate share URL
 */
export function getShareUrl(shareCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/share/${shareCode}`;
}

/**
 * Generate deep link URL (for opening in app or web)
 */
export function getDeepLinkUrl(shareCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/s/${shareCode}`;
}

