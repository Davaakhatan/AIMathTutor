/**
 * Supabase Client - Client-side only
 * Use this in React components and client-side code
 */
// Don't import logger here to avoid SSR issues - use console directly or import where needed

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy-load Supabase client to avoid SSR issues
let supabase: any = null;
let supabasePromise: Promise<any> | null = null;

// Export an async getter function that ensures we only access supabase client-side
export async function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used on the client side');
  }

  // ALWAYS return existing client if available (don't recreate)
  if (supabase) {
    return supabase;
  }

  // Only create once
  if (!supabasePromise) {
    supabasePromise = import('@supabase/supabase-js').then(({ createClient }) => {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
      }

      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            // Add timeout headers
            'X-Client-Timeout': '5000',
          },
        },
        db: {
          schema: 'public',
        },
        // Add query timeout
        realtime: {
          timeout: 5000,
        },
      });

      return supabase;
    });
  }

  return await supabasePromise;
}

// For backward compatibility, export supabase directly (will be null on server)
export { supabase };

// Helper to get current user
export async function getCurrentUser() {
  try {
    if (typeof window === 'undefined') return null;
    const supabase = await getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('[Supabase] Error getting current user', error);
    return null;
  }
}

// Helper to get current session
export async function getCurrentSession() {
  try {
    if (typeof window === 'undefined') return null;
    const supabase = await getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('[Supabase] Error getting current session', error);
    return null;
  }
}

