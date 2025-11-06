/**
 * Supabase Admin Client - Server-side only
 * Use this in API routes and server components
 * Has elevated permissions (bypasses RLS)
 * Lazy-loaded to avoid errors when env vars are missing
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

let supabaseAdminClient: SupabaseClient | null = null;
let supabaseAdminInitialized = false;

/**
 * Get Supabase admin client (lazy-loaded)
 * Returns null if environment variables are not configured
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  // Return cached client if already initialized
  if (supabaseAdminInitialized) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If env vars are missing, return null (for guest mode or when Supabase isn't configured)
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.debug('Supabase admin client not configured - missing environment variables');
    supabaseAdminInitialized = true; // Mark as initialized to avoid repeated checks
    return null;
  }

  // Create and cache the client
  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  supabaseAdminInitialized = true;
  logger.debug('Supabase admin client initialized');
  return supabaseAdminClient;
}

// For backward compatibility, export a getter that returns the client
// This allows existing code to work, but won't throw if env vars are missing
// Note: This Proxy will throw when methods are called if Supabase is not configured
// But it won't throw at module load time
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    if (!client) {
      // Return a no-op function for methods, or undefined for properties
      if (typeof prop === 'string' && prop !== 'then' && prop !== 'catch') {
        return () => {
          logger.warn('Supabase admin client not configured - operation skipped', { prop });
          return Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
        };
      }
      return undefined;
    }
    return (client as any)[prop];
  },
}) as SupabaseClient;

// Helper to get user by ID (server-side)
export async function getUserById(userId: string) {
  try {
    const client = getSupabaseAdmin();
    if (!client) {
      logger.warn('Cannot get user by ID - Supabase admin client not configured');
      return null;
    }
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user;
  } catch (error) {
    logger.error('Error getting user by ID', { error, userId });
    return null;
  }
}

