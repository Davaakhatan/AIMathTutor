/**
 * Supabase Admin Client - Server-side only
 * Use this in API routes and server components
 * Has elevated permissions (bypasses RLS)
 */
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase admin environment variables. Please check your .env.local file.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to get user by ID (server-side)
export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user;
  } catch (error) {
    logger.error('Error getting user by ID', { error, userId });
    return null;
  }
}

