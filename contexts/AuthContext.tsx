"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
// Use type-only imports to avoid loading the module
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { clearUserData, hasUserData } from "@/lib/localStorageUtils";
import { migrateLocalStorageToSupabase, hasExistingUserData } from "@/services/dataMigration";
import type { StudentProfile } from "@/services/studentProfileService";
import { 
  getStudentProfiles, 
  getActiveStudentProfile, 
  setActiveStudentProfile as setActiveProfile 
} from "@/services/studentProfileService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  activeProfile: StudentProfile | null;
  profiles: StudentProfile[];
  profilesLoading: boolean;
  signUp: (email: string, password: string, metadata?: { username?: string; display_name?: string }) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfiles: () => Promise<void>;
  setActiveProfile: (profileId: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfileState] = useState<StudentProfile | null>(null);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const profilesLoadedForUserRef = useRef<string | null>(null);
  const isLoadingProfilesRef = useRef(false);

  // Load student profiles for the current user
  const loadProfiles = useCallback(async (userId: string) => {
    // Prevent duplicate loads for the same user
    if (profilesLoadedForUserRef.current === userId || isLoadingProfilesRef.current) {
      logger.debug("Profiles already loaded or loading for user, skipping", { userId });
      return;
    }

    try {
      isLoadingProfilesRef.current = true;
      setProfilesLoading(true);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Profile loading timeout")), 10000);
      });
      
      const profilesPromise = Promise.all([
        getStudentProfiles(),
        getActiveStudentProfile(),
      ]);
      
      const [profilesList, active] = await Promise.race([profilesPromise, timeoutPromise]) as [StudentProfile[], StudentProfile | null];
      
      setProfiles(profilesList);
      setActiveProfileState(active);
      profilesLoadedForUserRef.current = userId;
      logger.info("Profiles loaded", { 
        count: profilesList.length, 
        activeProfileId: active?.id 
      });
    } catch (error) {
      logger.error("Error loading profiles", { 
        error: error instanceof Error ? error.message : String(error),
        userId 
      });
      // Don't set profilesLoadedForUserRef on error, so we can retry
      setProfiles([]);
      setActiveProfileState(null);
      // Re-throw so components can handle the error
      throw error;
    } finally {
      setProfilesLoading(false);
      isLoadingProfilesRef.current = false;
    }
  }, []);

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
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
          if (error) {
            logger.error("Error getting initial session", { error });
          }
          setSession(session);
          setUser(session?.user ?? null);
          
          // Load profiles if user is logged in
          if (session?.user) {
            await loadProfiles(session.user.id);
          }
          
          setLoading(false);
        });

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          logger.debug("Auth state changed", { event: _event, hasSession: !!session });
          
          // Update session and user state first
          setSession(session);
          setUser(session?.user ?? null);
          
          // Clear localStorage data when user logs in
          // This ensures fresh start with database data
          if (_event === "SIGNED_IN" && session?.user) {
            clearUserData();
            logger.info("Cleared localStorage data for logged-in user", { userId: session.user.id });
            // Load profiles after sign in (only once)
            if (profilesLoadedForUserRef.current !== session.user.id) {
              await loadProfiles(session.user.id);
            }
          }
          
          if (_event === "SIGNED_OUT") {
            // Clear profile state on sign out
            setActiveProfileState(null);
            setProfiles([]);
            profilesLoadedForUserRef.current = null;
            isLoadingProfilesRef.current = false;
          }
          
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
  }, [loadProfiles]);

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
      
      // Migrate localStorage data to Supabase before clearing
      // This preserves guest progress when user signs up
      if (data.user && hasUserData()) {
        try {
          logger.info("Migrating localStorage data to Supabase", { userId: data.user.id });
          const migrationResult = await migrateLocalStorageToSupabase(data.user.id);
          
          if (migrationResult.success) {
            logger.info("Data migration successful", { 
              userId: data.user.id, 
              migrated: migrationResult.migrated 
            });
          } else {
            logger.warn("Data migration completed with errors", { 
              userId: data.user.id, 
              errors: migrationResult.errors 
            });
          }
          
          // Clear localStorage after successful migration
          clearUserData();
          logger.info("Cleared localStorage data after migration", { userId: data.user.id });
        } catch (error) {
          logger.error("Data migration failed", { error, userId: data.user.id });
          // Still clear localStorage even if migration fails (user can start fresh)
          clearUserData();
        }
      } else if (data.user) {
        // No localStorage data to migrate, just clear
        clearUserData();
        logger.info("No localStorage data to migrate, cleared anyway", { userId: data.user.id });
      }
      
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
      
      // Check if user has existing data in Supabase
      // If not, migrate localStorage data (first-time login after guest mode)
      if (data.user) {
        try {
          const hasExisting = await hasExistingUserData(data.user.id);
          
          if (!hasExisting && hasUserData()) {
            // User has no Supabase data but has localStorage data - migrate it
            logger.info("Migrating localStorage data to Supabase on first login", { userId: data.user.id });
            const migrationResult = await migrateLocalStorageToSupabase(data.user.id);
            
            if (migrationResult.success) {
              logger.info("Data migration successful on login", { 
                userId: data.user.id, 
                migrated: migrationResult.migrated 
              });
            } else {
              logger.warn("Data migration completed with errors on login", { 
                userId: data.user.id, 
                errors: migrationResult.errors 
              });
            }
          }
          
          // Clear localStorage after migration (or if no migration needed)
          clearUserData();
          logger.info("Cleared localStorage data after sign in", { userId: data.user.id });
        } catch (error) {
          logger.error("Data migration failed on login", { error, userId: data.user.id });
          // Still clear localStorage even if migration fails
          clearUserData();
        }
      }
      
      return { error: null };
    } catch (error) {
      logger.error("Sign in exception", { error });
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const supabase = await getSupabaseClient();
      
      // Clear state immediately (optimistic update)
      setSession(null);
      setUser(null);
      setActiveProfileState(null);
      setProfiles([]);
      profilesLoadedForUserRef.current = null;
      isLoadingProfilesRef.current = false;
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error("Sign out error", { error });
        throw error;
      }
      logger.info("User signed out successfully");
    } catch (error) {
      logger.error("Sign out exception", { error });
      // Even if signOut fails, clear local state
      setSession(null);
      setUser(null);
      setActiveProfileState(null);
      setProfiles([]);
      profilesLoadedForUserRef.current = null;
      isLoadingProfilesRef.current = false;
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

  // Refresh profiles list
  const refreshProfiles = useCallback(async () => {
    if (!user) return;
    await loadProfiles(user.id);
  }, [user, loadProfiles]);

  // Set active profile
  const handleSetActiveProfile = useCallback(async (profileId: string | null) => {
    try {
      await setActiveProfile(profileId);
      // Refresh profiles to get updated active profile
      await refreshProfiles();
      logger.info("Active profile updated", { profileId });
    } catch (error) {
      logger.error("Error setting active profile", { error, profileId });
      throw error;
    }
  }, [refreshProfiles]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        activeProfile,
        profiles,
        profilesLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshProfiles,
        setActiveProfile: handleSetActiveProfile,
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

