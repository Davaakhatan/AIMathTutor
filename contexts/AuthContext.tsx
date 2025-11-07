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
  userRole: "student" | "parent" | "teacher" | "admin" | null;
  signUp: (email: string, password: string, metadata?: { username?: string; display_name?: string; role?: "student" | "parent" | "teacher" }) => Promise<{ error: AuthError | null }>;
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
  const [userRole, setUserRole] = useState<"student" | "parent" | "teacher" | "admin" | null>(null);
  const profilesLoadedForUserRef = useRef<string | null>(null);
  const isLoadingProfilesRef = useRef(false);
  const userDataLoadedRef = useRef<string | null>(null);

  // Load student profiles for the current user
  // NOTE: This is NOT a useCallback to avoid dependency issues
  const loadProfiles = async (userId: string, forceReload: boolean = false) => {
    logger.info("loadProfiles called", { userId, forceReload, currentRef: profilesLoadedForUserRef.current, isLoading: isLoadingProfilesRef.current });
    
    // If forceReload is true, ALWAYS reload regardless of current state
    // This is critical for login scenarios where we need fresh data
    if (forceReload) {
      logger.debug("Force reload requested, clearing refs and loading fresh", { userId });
      profilesLoadedForUserRef.current = null;
      isLoadingProfilesRef.current = false;
      // Continue to load - don't return early
    } else {
      // Prevent duplicate loads for the same user ONLY if we're currently loading
      if (isLoadingProfilesRef.current && profilesLoadedForUserRef.current === userId) {
        logger.debug("Profiles already loading for user, skipping", { userId });
        return;
      }

      // If profiles are already loaded for this user, skip
      // BUT: if profiles array is empty, always reload (might be stale state)
      if (profilesLoadedForUserRef.current === userId && profiles.length > 0) {
        logger.debug("Profiles already loaded for user, skipping", { userId, profileCount: profiles.length });
        return;
      }
    }

    try {
      isLoadingProfilesRef.current = true;
      setProfilesLoading(true);
      
      // Clear previous user's profiles if user changed
      if (profilesLoadedForUserRef.current && profilesLoadedForUserRef.current !== userId) {
        logger.debug("User changed, clearing previous profiles", { 
          previousUserId: profilesLoadedForUserRef.current, 
          newUserId: userId 
        });
        setProfiles([]);
        setActiveProfileState(null);
        profilesLoadedForUserRef.current = null;
      }
      
      // If forceReload is true and same user, clear profiles to show loading state
      if (forceReload && profilesLoadedForUserRef.current === userId) {
        logger.debug("Force reload for same user, clearing profiles temporarily", { userId });
        // Don't clear here - let the new data replace it
        // This prevents flickering
      }
      
      // Load profiles via API route (client queries timeout)
      // This allows UI to render immediately
      logger.info("Fetching profiles from API route", { userId });
      const fetchStartTime = Date.now();
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => {
        logger.warn("Profile fetch timeout - aborting", { userId });
        controller.abort();
      }, 15000); // 15 second timeout (increased from 10)
      
      fetch("/api/get-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        signal: controller.signal,
      })
        .then(async (response) => {
          clearTimeout(fetchTimeout);
          const fetchDuration = Date.now() - fetchStartTime;
          logger.info("Profile API response received", { 
            status: response.status, 
            duration: fetchDuration,
            userId 
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            logger.error("API route failed", { 
              status: response.status, 
              statusText: response.statusText,
              errorText,
              userId 
            });
            throw new Error(`API route failed: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          logger.info("Profile API JSON parsed", { 
            success: result.success, 
            profileCount: result.profiles?.length || 0,
            userId 
          });
          if (result.success) {
            const profilesList = result.profiles || [];
            const activeProfileId = result.activeProfileId;
            
            logger.info("Profiles API response received", { 
              count: profilesList.length, 
              activeProfileId,
              userRole: result.userRole,
              profileIds: profilesList.map((p: StudentProfile) => p.id)
            });
            
            // Find active profile from the list
            const active = activeProfileId 
              ? profilesList.find((p: StudentProfile) => p.id === activeProfileId) || null
              : (profilesList.length > 0 ? profilesList[0] : null);
            
            // Update userRole if provided
            if (result.userRole) {
              setUserRole(result.userRole);
            }
            
            setProfiles(profilesList);
            setActiveProfileState(active);
            profilesLoadedForUserRef.current = userId;
            logger.info("Profiles loaded via API route", { 
              count: profilesList.length, 
              activeProfileId: active?.id,
              profileNames: profilesList.map((p: StudentProfile) => p.name),
              userId
            });
            setProfilesLoading(false);
            isLoadingProfilesRef.current = false;
            
            // Log if no profiles found (for debugging)
            if (profilesList.length === 0) {
              // For parents/teachers, this is normal if they haven't linked students yet
              if (result.userRole === "parent" || result.userRole === "teacher") {
                logger.info("No linked students found for parent/teacher - this is normal if they haven't linked any students yet", { 
                  userId, 
                  userRole: result.userRole 
                });
              } else {
                // For students, this might indicate an issue
                logger.warn("No profiles found for student - this might indicate a database issue", { 
                  userId, 
                  userRole: result.userRole 
                });
              }
            }
          } else {
            logger.error("API route returned success: false", { result });
            throw new Error(result.error || "API route returned success: false");
          }
        })
        .catch((error) => {
          clearTimeout(fetchTimeout);
          logger.error("Error loading profiles via API route", { 
            error: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : undefined,
            userId 
          });
          
          // If it's an abort error (timeout), set empty profiles and continue
          if (error instanceof Error && error.name === 'AbortError') {
            logger.warn("Profile loading timed out, setting empty profiles", { userId });
            setProfiles([]);
            setActiveProfileState(null);
            setProfilesLoading(false);
            isLoadingProfilesRef.current = false;
            return;
          }
          
          // Fallback to getStudentProfiles (which also uses API route now)
          getStudentProfiles()
            .then((profilesList) => {
              const active = profilesList.length > 0 ? profilesList[0] : null;
              setProfiles(profilesList);
              setActiveProfileState(active);
              profilesLoadedForUserRef.current = userId;
              setProfilesLoading(false);
              isLoadingProfilesRef.current = false;
            })
            .catch((fallbackError) => {
              logger.error("Fallback profile loading also failed", { error: fallbackError });
              setProfiles([]);
              setActiveProfileState(null);
              setProfilesLoading(false);
              isLoadingProfilesRef.current = false;
            });
        });
    } catch (error) {
      logger.error("Error in loadProfiles", { 
        error: error instanceof Error ? error.message : String(error),
        userId 
      });
      // Don't clear profiles on error - they might still be valid
      // Only clear if we're sure there's an error and we should retry
      // The retry logic will handle reloading
      setProfilesLoading(false);
      isLoadingProfilesRef.current = false;
      
      // If profiles were never loaded for this user, set empty array
      // Otherwise, keep existing profiles (they might still be valid)
      if (profilesLoadedForUserRef.current !== userId) {
        logger.warn("No profiles loaded for user, setting empty array", { userId });
        setProfiles([]);
        setActiveProfileState(null);
      } else {
        logger.info("Error loading profiles, but keeping existing profiles", { 
          userId, 
          existingCount: profiles.length 
        });
      }
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Set a timeout to ensure loading is always set to false
    const loadingTimeout = setTimeout(() => {
      logger.warn("Loading timeout reached, forcing loading to false");
      setLoading(false);
    }, 5000); // 5 second timeout

    // Dynamically load and initialize Supabase
    const initSupabase = async () => {
      try {
        const supabase = await getSupabaseClient();
        
        // Track if we've set loading to false (to prevent duplicate calls)
        let hasSetInitialLoading = false;
        
        // Set loading to false IMMEDIATELY - don't wait for getSession
        // This allows the app to render instantly, then we'll update auth state in background
        if (!hasSetInitialLoading) {
          hasSetInitialLoading = true;
          clearTimeout(loadingTimeout);
          setLoading(false);
          logger.debug("Loading set to false immediately - app will render");
        }
        
        // Get initial session in background (non-blocking)
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
          if (error) {
            logger.error("Error getting initial session", { error });
            // Session is already cleared, just log the error
            setSession(null);
            setUser(null);
            setUserRole(null);
            return;
          }
          
          // Verify session is still valid by checking with Supabase
          // Sometimes localStorage has stale sessions
          if (session) {
            try {
              // Verify the session is still valid by getting the user
              const { data: { user }, error: userError } = await supabase.auth.getUser();
              if (userError || !user) {
                logger.warn("Session found but user verification failed, clearing session", { error: userError });
                // Session is invalid, clear it
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setUserRole(null);
                setActiveProfileState(null);
                setProfiles([]);
                return;
              }
            } catch (verifyError) {
              logger.error("Error verifying session", { error: verifyError });
              // If verification fails, clear the session
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setUserRole(null);
              setActiveProfileState(null);
              setProfiles([]);
              return;
            }
          }
          
          // Update session state (app is already rendered)
          logger.debug("Initial session loaded", { hasSession: !!session, userId: session?.user?.id });
          setSession(session);
          setUser(session?.user ?? null);
          
          // Load user role and data in background (non-blocking)
          if (session?.user) {
            // Load role
            supabase
              .from("profiles")
              .select("role")
              .eq("id", session.user.id)
              .single()
              .then(({ data: profile }) => {
                setUserRole((profile?.role as any) || null);
              })
              .catch((err) => {
                logger.error("Error loading user role", { error: err });
              });
            
            // Load profiles and user data in background
            // Always load on initial session - clear ref first to ensure fresh load
            logger.info("Loading profiles on initial session", { 
              userId: session.user.id, 
              currentRef: profilesLoadedForUserRef.current 
            });
            // Clear ref and force reload on initial session to ensure profiles are loaded from database
            // IMPORTANT: Clear refs BEFORE calling loadProfiles to ensure fresh load
            logger.info("Clearing profile refs before initial load", { 
              previousRef: profilesLoadedForUserRef.current 
            });
            profilesLoadedForUserRef.current = null;
            isLoadingProfilesRef.current = false;
            // DON'T clear profiles state here - let loadProfiles handle it
            // This prevents the UI from showing "no profiles" while loading
            // setProfiles([]);
            // setActiveProfileState(null);
            // CRITICAL: Load profiles immediately and ensure it completes
            // Use async IIFE to ensure proper execution
            (async () => {
              try {
                logger.info("Starting profile load on initial session", { userId: session.user.id });
                await loadProfiles(session.user.id, true);
                logger.info("Profiles loaded successfully on initial session");
              } catch (err) {
                logger.error("Error loading profiles on initial session", { error: err });
                // Retry once after a short delay
                setTimeout(async () => {
                  logger.info("Retrying profile load after initial failure");
                  try {
                    await loadProfiles(session.user.id, true);
                    logger.info("Retry succeeded");
                  } catch (retryErr) {
                    logger.error("Retry also failed", { error: retryErr });
                    // Final fallback: try one more time after another delay
                    setTimeout(async () => {
                      logger.info("Final retry attempt");
                      await loadProfiles(session.user.id, true).catch((finalErr) => {
                        logger.error("Final retry failed", { error: finalErr });
                      });
                    }, 3000);
                  }
                }, 2000);
              }
            })();
            if (userDataLoadedRef.current !== session.user.id) {
              loadUserDataFromSupabase().catch((err) => {
                logger.error("Error loading user data on initial session", { error: err });
              });
            }
          } else {
            // No session - ensure state is cleared
            setUserRole(null);
            setActiveProfileState(null);
            setProfiles([]);
          }
        }).catch((error) => {
          logger.error("Error in getSession promise", { error });
          // Don't set loading to false again - already set above
        });

        // Listen for auth changes (for sign in/out events, not initial load)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          logger.debug("Auth state changed", { event: _event, hasSession: !!session });
          
          // Skip INITIAL_SESSION - we already handled it in getSession()
          if (_event === "INITIAL_SESSION") {
            logger.debug("Skipping INITIAL_SESSION - already handled");
            return;
          }
          
          // Update session and user state
          setSession(session);
          setUser(session?.user ?? null);
          
          // Load user role if user is logged in
          if (session?.user) {
            try {
              const supabase = await getSupabaseClient();
              const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();
              
              setUserRole((profile?.role as any) || null);
            } catch (error) {
              logger.error("Error loading user role in auth state change", { error });
              // Continue anyway
            }
          } else {
            setUserRole(null);
          }
          
          // Handle sign in (not initial session)
          if (_event === "SIGNED_IN" && session?.user) {
            logger.info("User signed in", { userId: session.user.id });
            
            // CRITICAL: Always load profiles on sign in (force reload to ensure fresh data)
            // Clear refs first to ensure fresh load
            logger.info("Loading profiles on SIGNED_IN event", { 
              userId: session.user.id, 
              currentRef: profilesLoadedForUserRef.current 
            });
            profilesLoadedForUserRef.current = null;
            isLoadingProfilesRef.current = false;
            
            // CRITICAL: Load profiles immediately on sign in
            // Use Promise.resolve().then() to ensure it executes even if there are errors
            Promise.resolve().then(async () => {
              try {
                logger.info("Starting profile load on SIGNED_IN", { userId: session.user.id });
                // Ensure refs are cleared before loading
                profilesLoadedForUserRef.current = null;
                isLoadingProfilesRef.current = false;
                await loadProfiles(session.user.id, true);
                logger.info("Profiles loaded successfully on SIGNED_IN");
              } catch (err) {
                logger.error("Error loading profiles on sign in", { error: err });
                // Retry immediately (don't wait)
                Promise.resolve().then(async () => {
                  try {
                    logger.info("Retrying profile load after SIGNED_IN failure");
                    await loadProfiles(session.user.id, true);
                    logger.info("Retry succeeded on SIGNED_IN");
                  } catch (retryErr) {
                    logger.error("Retry also failed on SIGNED_IN", { error: retryErr });
                    // Final fallback: try one more time after delay
                    setTimeout(async () => {
                      logger.info("Final retry attempt on SIGNED_IN");
                      await loadProfiles(session.user.id, true).catch((finalErr) => {
                        logger.error("Final retry failed on SIGNED_IN", { error: finalErr });
                      });
                    }, 2000);
                  }
                });
              }
            });
            
            if (userDataLoadedRef.current !== session.user.id) {
              loadUserDataFromSupabase().catch((err) => {
                logger.error("Error loading user data on sign in", { error: err });
              });
            }
          }
          
          if (_event === "SIGNED_OUT") {
            // Clear ALL state on sign out
            logger.info("SIGNED_OUT event received, clearing all state");
            setSession(null);
            setUser(null);
            setUserRole(null);
            setActiveProfileState(null);
            setProfiles([]);
            profilesLoadedForUserRef.current = null;
            isLoadingProfilesRef.current = false;
            userDataLoadedRef.current = null;
            // Clear localStorage cache
            clearUserData();
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        logger.error("Failed to initialize Supabase client", { error });
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };

    let cleanup: (() => void) | undefined;
    initSupabase().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      clearTimeout(loadingTimeout);
      if (cleanup) cleanup();
    };
  }, []); // Empty deps - loadProfiles is now a regular function, not a callback

  // CRITICAL: Load profiles whenever user changes (backup to SIGNED_IN event)
  // This ensures profiles load even if the SIGNED_IN event handler fails
  useEffect(() => {
    if (user && !loading) {
      // Only load if profiles aren't already loaded for this user
      if (profilesLoadedForUserRef.current !== user.id && !isLoadingProfilesRef.current) {
        logger.info("User changed, loading profiles via useEffect", { 
          userId: user.id,
          currentRef: profilesLoadedForUserRef.current 
        });
        // Use a small delay to avoid race conditions with SIGNED_IN handler
        const timeoutId = setTimeout(() => {
          loadProfiles(user.id, true).catch((err) => {
            logger.error("Error loading profiles in useEffect", { error: err });
          });
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    } else if (!user) {
      // Clear profiles when user logs out
      profilesLoadedForUserRef.current = null;
      isLoadingProfilesRef.current = false;
      setProfiles([]);
      setActiveProfileState(null);
    }
  }, [user, loading]); // Load when user or loading state changes

  const signUp = async (
    email: string,
    password: string,
    metadata?: { username?: string; display_name?: string; role?: "student" | "parent" | "teacher" }
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
            role: metadata?.role || "student", // Default to student if not specified
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
      logger.info("Sign out initiated");
      const supabase = await getSupabaseClient();
      
      // Clear ALL state immediately (optimistic update)
      setSession(null);
      setUser(null);
      setUserRole(null);
      setActiveProfileState(null);
      setProfiles([]);
      profilesLoadedForUserRef.current = null;
      isLoadingProfilesRef.current = false;
      userDataLoadedRef.current = null;
      
      // Clear localStorage cache
      clearUserData();
      
      // Sign out from Supabase (this clears the session from Supabase storage)
      // Don't wait for it - clear state immediately for better UX
      supabase.auth.signOut().then(({ error }) => {
        if (error) {
          logger.error("Sign out error from Supabase", { error });
        } else {
          logger.info("User signed out successfully from Supabase");
        }
      }).catch((err) => {
        logger.error("Sign out promise error", { error: err });
      });
      
      // Clear Supabase's localStorage keys directly (in case signOut didn't clear them)
      if (typeof window !== 'undefined') {
        try {
          const supabaseKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || key.includes('supabase')
          );
          supabaseKeys.forEach(key => {
            localStorage.removeItem(key);
          });
          logger.debug("Cleared Supabase localStorage keys", { keys: supabaseKeys });
        } catch (storageError) {
          logger.error("Error clearing Supabase localStorage", { error: storageError });
        }
      }
      
      logger.info("Sign out complete - all state cleared");
    } catch (error) {
      logger.error("Sign out exception", { error });
      console.error("Sign out error:", error);
      // Even if signOut fails, ensure all state is cleared
      setSession(null);
      setUser(null);
      setUserRole(null);
      setActiveProfileState(null);
      setProfiles([]);
      profilesLoadedForUserRef.current = null;
      isLoadingProfilesRef.current = false;
      userDataLoadedRef.current = null;
      clearUserData();
      
      // Also clear Supabase localStorage keys on error
      if (typeof window !== 'undefined') {
        try {
          const supabaseKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || key.includes('supabase')
          );
          supabaseKeys.forEach(key => {
            localStorage.removeItem(key);
          });
        } catch (storageError) {
          logger.error("Error clearing Supabase localStorage in catch", { error: storageError });
        }
      }
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
  }, [user, userDataLoading, activeProfile]);

  // Refresh profiles list
  const refreshProfiles = useCallback(async () => {
    if (!user) return;
    // Force reload by passing true
    await loadProfiles(user.id, true);
  }, [user]); // Remove loadProfiles from deps since it's now a regular function

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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        activeProfile,
        profiles,
        profilesLoading,
        userRole,
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


