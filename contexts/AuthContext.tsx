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
import { loadUserData } from "@/services/supabaseDataService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  activeProfile: StudentProfile | null;
  profiles: StudentProfile[];
  profilesLoading: boolean;
  userDataLoading: boolean;
  signUp: (email: string, password: string, metadata?: { username?: string; display_name?: string }) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfiles: () => Promise<void>;
  setActiveProfile: (profileId: string | null) => Promise<void>;
  loadUserDataFromSupabase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfileState] = useState<StudentProfile | null>(null);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const profilesLoadedForUserRef = useRef<string | null>(null);
  const isLoadingProfilesRef = useRef(false);
  const userDataLoadedRef = useRef<string | null>(null);

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
      
      // Set empty state immediately (non-blocking UI)
      setProfiles([]);
      setActiveProfileState(null);
      
      // Load profiles - don't wait, let it happen in background
      // This allows UI to render immediately
      getStudentProfiles()
        .then(async (profilesList) => {
          let active: StudentProfile | null = null;
          
          // Get active profile using the profiles list (avoids extra query)
          try {
            active = await getActiveStudentProfile(profilesList);
          } catch (error) {
            logger.warn("Error fetching active profile", { error });
            active = null;
          }
          
          setProfiles(profilesList);
          setActiveProfileState(active);
          profilesLoadedForUserRef.current = userId;
          logger.info("Profiles loaded", { 
            count: profilesList.length, 
            activeProfileId: active?.id 
          });
          setProfilesLoading(false);
          isLoadingProfilesRef.current = false;
        })
        .catch((error) => {
          logger.error("Error loading profiles", { error, userId });
          setProfiles([]);
          setActiveProfileState(null);
          setProfilesLoading(false);
          isLoadingProfilesRef.current = false;
        });
    } catch (error) {
      logger.error("Error in loadProfiles", { 
        error: error instanceof Error ? error.message : String(error),
        userId 
      });
      setProfiles([]);
      setActiveProfileState(null);
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
          
          // Load profiles and user data if user is logged in
          if (session?.user) {
            await Promise.all([
              loadProfiles(session.user.id),
              loadUserDataFromSupabase(),
            ]);
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
          
          // On sign in: Load profiles and user data from Supabase
          // localStorage will be used as cache, Supabase as source of truth
          if (_event === "SIGNED_IN" && session?.user) {
            logger.info("User signed in, loading data from Supabase", { userId: session.user.id });
            // Load profiles and user data in parallel
            const loadPromises = [];
            if (profilesLoadedForUserRef.current !== session.user.id) {
              loadPromises.push(loadProfiles(session.user.id));
            }
            if (userDataLoadedRef.current !== session.user.id) {
              loadPromises.push(loadUserDataFromSupabase());
            }
            await Promise.all(loadPromises);
          }
          
          if (_event === "SIGNED_OUT") {
            // Clear profile state on sign out
            setActiveProfileState(null);
            setProfiles([]);
            profilesLoadedForUserRef.current = null;
            isLoadingProfilesRef.current = false;
            userDataLoadedRef.current = null;
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
      
      // Migrate localStorage data to Supabase (keep localStorage as cache)
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
          // Don't clear localStorage - use it as cache for faster loading
          logger.info("Keeping localStorage as cache", { userId: data.user.id });
        } catch (error) {
          logger.error("Data migration failed", { error, userId: data.user.id });
          // Keep localStorage even if migration fails - user can retry later
        }
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
      // Keep localStorage as cache for faster loading
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
          // Don't clear localStorage - use it as cache for faster loading
          // Data will sync with Supabase in the background
          logger.info("Keeping localStorage as cache for faster loading", { userId: data.user.id });
        } catch (error) {
          logger.error("Data migration failed on login", { error, userId: data.user.id });
          // Keep localStorage even if migration fails - user can retry later
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

  // Set active profile - optimized for speed
  const handleSetActiveProfile = useCallback(async (profileId: string | null) => {
    try {
      // Optimistically update UI immediately (don't wait for database)
      const newActiveProfile = profileId 
        ? profiles.find(p => p.id === profileId) || null
        : null;
      setActiveProfileState(newActiveProfile);
      
      // Update database in background (don't wait)
      setActiveProfile(profileId)
        .then(async () => {
          logger.info("Active profile updated in database", { profileId });
          // Reload data for the new profile
          if (user) {
            userDataLoadedRef.current = null; // Reset to allow reload
            await loadUserDataFromSupabase();
          }
        })
        .catch((error) => {
          logger.error("Error updating active profile in database", { error, profileId });
          // Revert on error - reload profiles to get correct state
          refreshProfiles().catch((refreshError) => {
            logger.error("Error refreshing profiles after failed update", { refreshError });
          });
        });
      
      logger.info("Active profile updated (optimistic)", { profileId });
    } catch (error) {
      logger.error("Error setting active profile", { error, profileId });
      // Revert on error
      await refreshProfiles();
      throw error;
    }
  }, [profiles, refreshProfiles, user, loadUserDataFromSupabase]);

  // Load user data from Supabase and cache in localStorage
  const loadUserDataFromSupabase = useCallback(async () => {
    if (!user) return;
    
    // Prevent duplicate loads
    if (userDataLoadedRef.current === user.id || userDataLoading) {
      logger.debug("User data already loaded or loading, skipping", { userId: user.id });
      return;
    }

    try {
      setUserDataLoading(true);
      // Load data for the active profile (or user if no profile)
      const activeProfileId = activeProfile?.id || null;
      const data = await loadUserData(user.id, activeProfileId);
      
      // Cache in localStorage for fast access
      if (data.xpData) {
        localStorage.setItem("aitutor-xp", JSON.stringify({
          totalXP: data.xpData.total_xp,
          level: data.xpData.level,
          xpToNextLevel: data.xpData.xp_to_next_level,
          xpHistory: data.xpData.xp_history,
          recentGains: data.xpData.recent_gains,
        }));
      }
      
      if (data.streakData) {
        localStorage.setItem("aitutor-streak", JSON.stringify({
          currentStreak: data.streakData.current_streak,
          longestStreak: data.streakData.longest_streak,
          lastStudyDate: data.streakData.last_study_date ? new Date(data.streakData.last_study_date).getTime() : 0,
        }));
      }
      
      if (data.problems.length > 0) {
        localStorage.setItem("aitutor-problem-history", JSON.stringify(data.problems));
      }
      
      if (data.achievements.length > 0) {
        localStorage.setItem("aitutor-achievements", JSON.stringify(data.achievements));
      }
      
      if (data.studySessions.length > 0) {
        localStorage.setItem("aitutor-study-sessions", JSON.stringify(data.studySessions));
      }
      
      if (data.dailyGoals.length > 0) {
        // Get today's goal or most recent
        const today = new Date().toISOString().split("T")[0];
        const todayGoal = data.dailyGoals.find(g => g.date === today);
        if (todayGoal) {
          localStorage.setItem("aitutor-daily-goals", JSON.stringify({
            problems: todayGoal.problems_goal,
            time: todayGoal.time_goal,
            date: todayGoal.date,
          }));
        }
      }
      
      userDataLoadedRef.current = user.id;
      logger.info("User data loaded from Supabase and cached", { 
        userId: user.id,
        hasXP: !!data.xpData,
        hasStreak: !!data.streakData,
        problemsCount: data.problems.length,
        achievementsCount: data.achievements.length,
      });
    } catch (error) {
      logger.error("Error loading user data from Supabase", { error, userId: user.id });
    } finally {
      setUserDataLoading(false);
    }
  }, [user, userDataLoading]);

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
        loadUserDataFromSupabase,
        userDataLoading,
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

