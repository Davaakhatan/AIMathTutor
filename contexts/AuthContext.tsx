"use client";

import { createContext, useContext, useEffect, useState } from "react";
// Use type-only imports to avoid loading the module
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { username?: string; display_name?: string }) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Dynamically load and initialize Supabase
    const initSupabase = async () => {
      try {
        const supabase = await getSupabaseClient();
        
        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error) {
            logger.error("Error getting initial session", { error });
          }
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          logger.debug("Auth state changed", { event: _event, hasSession: !!session });
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        logger.error("Failed to initialize Supabase client", { error });
        setLoading(false);
      }
    };

    let cleanup: (() => void) | undefined;
    initSupabase().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata?: { username?: string; display_name?: string }
  ) => {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: metadata?.username || email.split("@")[0],
            display_name: metadata?.display_name || email.split("@")[0],
          },
        },
      });

      if (error) {
        logger.error("Sign up error", { 
          error: error.message || error,
          status: error.status,
          name: error.name,
          fullError: JSON.stringify(error, null, 2)
        });
        console.error("Sign up error details:", error);
        return { error };
      }

      logger.info("User signed up successfully", { userId: data.user?.id });
      return { error: null };
    } catch (error) {
      logger.error("Sign up exception", { error });
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error("Sign in error", { 
          error: error.message || error,
          status: error.status,
          name: error.name,
          fullError: JSON.stringify(error, null, 2)
        });
        console.error("Sign in error details:", error);
        return { error };
      }

      logger.info("User signed in successfully", { userId: data.user?.id });
      return { error: null };
    } catch (error) {
      logger.error("Sign in exception", { error });
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error("Sign out error", { error });
        throw error;
      }
      logger.info("User signed out successfully");
    } catch (error) {
      logger.error("Sign out exception", { error });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        logger.error("Password reset error", { error });
        return { error };
      }

      logger.info("Password reset email sent", { email });
      return { error: null };
    } catch (error) {
      logger.error("Password reset exception", { error });
      return { error: error as AuthError };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

