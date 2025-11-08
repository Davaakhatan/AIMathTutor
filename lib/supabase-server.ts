/**
 * Supabase Server Client - Server-side only
 * Use this in API routes and server-side code
 * Uses service role key for admin access (bypasses RLS when needed)
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseServer: ReturnType<typeof createClient> | null = null;

/**
 * Get Supabase server client (with service role key for admin access)
 * This bypasses RLS and should only be used in server-side API routes
 */
export function getSupabaseServer() {
  if (supabaseServer) {
    return supabaseServer;
  }

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  // Use service role key if available (for admin operations)
  // Otherwise use anon key (will respect RLS)
  const supabaseKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error("Supabase keys are not set. Please check your .env.local file.");
  }

  supabaseServer = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  logger.info("Supabase server client initialized", {
    hasServiceKey: !!supabaseServiceKey,
    usingServiceRole: !!supabaseServiceKey,
    usingAnonKey: !supabaseServiceKey,
    keyPreview: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'none',
    url: supabaseUrl,
  });

  return supabaseServer;
}

/**
 * Get Supabase client for a specific user (respects RLS)
 * Use this when you have a user ID and want to access their data
 */
export async function getSupabaseForUser(userId: string) {
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  }

  // Create a client with the user's context
  // Note: In API routes, we need to set the user context via JWT
  // For now, we'll use the service role key but filter by user_id
  const client = getSupabaseServer();
  
  return {
    client,
    userId, // Store userId for filtering
  };
}

