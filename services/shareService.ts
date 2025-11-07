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
    // Determine base URL for API calls
    // In server-side code, we need absolute URL
    const baseUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : "http://localhost:3002";
    
    // Call API route instead of direct Supabase call
    const response = await fetch(`${baseUrl}/api/share/generate`, {
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
    if (!shareCode || typeof shareCode !== 'string') {
      console.error("[getShareByCode] Invalid shareCode:", shareCode, typeof shareCode);
      return null;
    }

    // Call API route instead of direct Supabase call
    let response: Response | null = null;
    try {
      const url = `/api/share/${encodeURIComponent(shareCode)}`;
      console.log("[getShareByCode] Fetching:", url);
      response = await fetch(url);
      console.log("[getShareByCode] Response received:", response.status, response.ok);
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error("[getShareByCode] Fetch failed:", errorMsg, shareCode);
      return null;
    }
    
    if (!response) {
      console.error("[getShareByCode] No response from fetch", shareCode);
      return null;
    }
    
    // Read response body once - can only be read once
    let responseText: string;
    try {
      console.log("[getShareByCode] Reading response body...");
      responseText = await response.text();
      console.log("[getShareByCode] Response text length:", responseText.length);
    } catch (readError) {
      const errorMsg = readError instanceof Error ? readError.message : String(readError);
      console.error("[getShareByCode] Error reading response body:", errorMsg, shareCode, response.status);
      return null;
    }
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log("[getShareByCode] Share not found (404):", shareCode);
        return null; // Not found
      }
      console.error("[getShareByCode] Error response:", response.status, responseText?.substring(0, 100), shareCode);
      return null;
    }
    
    // Parse JSON from the response text we already read
    let result;
    try {
      if (!responseText || responseText.trim() === '') {
        console.error("[getShareByCode] Empty response:", shareCode, response.status);
        return null;
      }
      console.log("[getShareByCode] Parsing JSON...");
      result = JSON.parse(responseText);
      console.log("[getShareByCode] JSON parsed successfully, result.success:", result?.success);
    } catch (jsonError) {
      const jsonErrorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
      console.error("[getShareByCode] JSON parse error:", jsonErrorMessage, shareCode, response.status);
      return null;
    }
    
    // Defensive checks
    if (!result) {
      console.warn("[getShareByCode] Null/undefined result:", shareCode);
      return null;
    }
    
    if (result.success !== true) {
      console.warn("[getShareByCode] Success is not true:", shareCode, result);
      return null;
    }
    
    if (!result.share || typeof result.share !== 'object') {
      console.warn("[getShareByCode] Invalid share data:", shareCode, !!result.share, typeof result.share);
      return null;
    }
    
    // Check if expired
    if (result.share.expires_at && new Date(result.share.expires_at) < new Date()) {
      console.warn("[getShareByCode] Share expired:", shareCode, result.share.expires_at);
      return null;
    }
    
    console.log("[getShareByCode] Success! Returning share data for:", shareCode);
    return result.share as ShareData;
  } catch (error) {
    // Safely extract error information - this is the catch-all
    // Be extremely defensive to avoid any TypeError when accessing error properties
    let errorMessage = "Unknown error";
    let errorType = "Unknown";
    
    // Try to get error message - be very careful
    try {
      if (error && typeof error === 'object') {
        // Try to get message property
        if ('message' in error && typeof (error as any).message === 'string') {
          errorMessage = (error as any).message;
        }
        // Try to get error type - avoid accessing constructor directly
        if ('name' in error && typeof (error as any).name === 'string') {
          errorType = (error as any).name;
        } else if (error instanceof Error) {
          // Only use constructor if it's a real Error instance
          try {
            const constructorName = error.constructor?.name;
            if (constructorName) {
              errorType = constructorName;
            }
          } catch (e) {
            // Ignore constructor access errors
          }
        }
      } else if (error !== null && error !== undefined) {
        errorMessage = String(error);
        errorType = typeof error;
      }
    } catch (serializationError) {
      // If we can't even access error properties, just use defaults
      errorMessage = "Error object could not be accessed";
      errorType = "AccessError";
    }
    
    // Log with console.error only - avoid logger completely
    try {
      console.error("[getShareByCode] CATCH BLOCK - Error details:", {
        errorMessage,
        errorType,
        shareCode,
        errorTypeof: typeof error,
        errorIsError: error instanceof Error,
        errorString: String(error),
      });
    } catch (consoleError) {
      // Even console.error failed - just log basic info
      console.error("[getShareByCode] Error occurred for shareCode:", shareCode);
    }
    
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

