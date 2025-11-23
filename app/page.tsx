"use client";

import { useState, useEffect, Suspense } from "react";
import ProblemInput from "@/components/ProblemInput";
import ChatUI from "@/components/chat/ChatUI";
import DifficultyModeSelector from "@/components/stretch/DifficultyModeSelector";
import ConversationExport from "@/components/ConversationExport";
import ProblemGenerator from "@/components/ProblemGenerator";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import AutoSave from "@/components/AutoSave";
import ProblemStats from "@/components/ProblemStats";
import SkipLink from "@/components/SkipLink";
import OfflineIndicator from "@/components/OfflineIndicator";
import SyncingIndicator from "@/components/SyncingIndicator";
import PWAInstaller from "@/components/PWAInstaller";
import AuthButton from "@/components/auth/AuthButton";
import AuthModal from "@/components/auth/AuthModal";
import LandingPage from "@/components/landing/LandingPage";
import ToolsMenu from "@/components/unified/ToolsMenu";
import LearningHub from "@/components/unified/LearningHub";
import ShareProblem from "@/components/ShareProblem";
import BookmarkButton from "@/components/BookmarkButton";
import SettingsMenu from "@/components/unified/SettingsMenu";
import ReferralButton from "@/components/referral/ReferralButton";
import StudyStreak from "@/components/StudyStreak";
import PrintView from "@/components/PrintView";
import ProblemDifficultyIndicator from "@/components/ProblemDifficultyIndicator";
import StudyReminder from "@/components/StudyReminder";
import ProblemSuggestions from "@/components/ProblemSuggestions";
import SessionResume from "@/components/SessionResume";
import ProblemProgress from "@/components/ProblemProgress";
import ProblemOfTheDay from "@/components/ProblemOfTheDay";
import XPSystem from "@/components/XPSystem";
import StudentQuickStats from "@/components/StudentQuickStats";
import GamificationHub from "@/components/unified/GamificationHub";
import StudyTimer from "@/components/StudyTimer";
import DailyGoals from "@/components/DailyGoals";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import NotificationCenter from "@/components/NotificationCenter";
import ProgressHub from "@/components/unified/ProgressHub";
import WelcomeScreen from "@/components/WelcomeScreen";
import { ParsedProblem, Message } from "@/types";
import { normalizeProblemText } from "@/lib/textUtils";
import { logger } from "@/lib/logger";
import MathRenderer from "@/components/math/MathRenderer";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PanelProvider } from "@/contexts/PanelContext";

function HomeContentInternal() {
  const [isMounted, setIsMounted] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("signup");
  const [currentProblem, setCurrentProblem] = useState<ParsedProblem | null>(
    null
  );
  
  // Set mounted state after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
    
    // Check if welcome was already seen on mount
    const checkWelcome = () => {
      if (typeof window !== "undefined") {
        const hasSeenWelcome = window.localStorage.getItem("aitutor-welcome-seen") === "true" || 
                               window.localStorage.getItem("aitutor-welcome-seen") === '"true"';
        return hasSeenWelcome;
      }
      return false;
    };
    
    // Listen for welcome dismissal
    const handleWelcomeDismissed = () => {
      // Welcome dismissed - ensure main content is visible
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.style.visibility = "visible";
      }
    };
    
    window.addEventListener("welcomeDismissed", handleWelcomeDismissed);
    
    // Check on mount
    if (checkWelcome()) {
      handleWelcomeDismissed();
    }
    
    return () => window.removeEventListener("welcomeDismissed", handleWelcomeDismissed);
  }, []);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [difficultyMode, setDifficultyMode] = useState<"elementary" | "middle" | "high" | "advanced">("middle");
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const { toasts, showToast, removeToast } = useToast();
  const { user, loading: authLoading, activeProfile, userRole, isViewingStudent, loadUserDataFromSupabase, userDataLoading, profilesLoading } = useAuth();
  const [xpData, setXPData] = useState({ totalXP: 0, level: 1, problemsSolved: 0 });
  const [streak, setStreak] = useState(0);
  const [isStudyActive, setIsStudyActive] = useState(false);
  const [problemsSolvedToday, setProblemsSolvedToday] = useState(0);
  const [timeSpentToday, setTimeSpentToday] = useState(0);
  const [settings, setSettings] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("aitutor-settings");
        const parsed = saved ? JSON.parse(saved) : { showStats: true, voiceEnabled: true, darkMode: false };
        // Apply dark mode immediately on mount
        if (parsed.darkMode) {
          document.documentElement.classList.add("dark");
        }
        return parsed;
      } catch {
        return { showStats: true, voiceEnabled: true, darkMode: false };
      }
    }
    return { showStats: true, voiceEnabled: true, darkMode: false };
  });

  // Listen for settings changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem("aitutor-settings");
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch {
        // Ignore
      }
    };
    
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      try {
        const saved = localStorage.getItem("aitutor-settings");
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch {
        // Ignore
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("settingsChanged", handleSettingsChanged);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settingsChanged", handleSettingsChanged);
    };
  }, []);

  // Effect to reload data when activeProfile changes (for parent/teacher profile switching)
  useEffect(() => {
    if (user && (userRole === "parent" || userRole === "teacher")) {
      logger.info("Active profile changed, reloading data", { 
        userId: user.id, 
        activeProfileId: activeProfile?.id || null,
        userRole 
      });
      // Force reload user data from Supabase for the new active profile
      loadUserDataFromSupabase(true).catch((error) => {
        logger.error("Error reloading data after profile switch", { error });
      });
    }
  }, [activeProfile?.id, user, userRole, loadUserDataFromSupabase]);

  // Handle session resume
  const handleResumeSession = (problem: ParsedProblem, messages: Message[], sessionId: string) => {
    setCurrentProblem(problem);
    setSessionId(sessionId);
    setInitialMessages(messages);
    setAllMessages(messages);
    showToast("Session resumed!", "success");
  };

  const handleProblemParsed = async (problem: ParsedProblem) => {
    logger.debug("handleProblemParsed called", { problemText: problem.text.substring(0, 50), problemType: problem.type });
    
    // Set problem immediately so UI updates
    setCurrentProblem(problem);
    
    // Auto-save to history (will sync to database via useProblemHistory hook)
    // Do this in background - don't block chat initialization
    (async () => {
      try {
        const history = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
        const newProblem = {
          ...problem,
          id: Date.now().toString(),
          savedAt: Date.now(),
        };
        const updatedHistory = [newProblem, ...history.filter((p: any) => p.text !== problem.text)].slice(0, 20);
        localStorage.setItem("aitutor-problem-history", JSON.stringify(updatedHistory));
        
        // Also save to database if authenticated (via service) - non-blocking
        if (user) {
          try {
            const { saveProblem } = await import("@/services/supabaseDataService");
            const profileIdForSave = userRole === "student" ? null : (activeProfile?.id || null);
            // Don't await - let it run in background
            saveProblem(user.id, {
              text: problem.text,
              type: problem.type || "unknown",
              image_url: problem.imageUrl,
              parsed_data: problem,
              is_bookmarked: false,
              is_generated: false,
              source: "user_input",
            }, profileIdForSave).then(() => {
              // Trigger a reload of problem history after save completes
              window.dispatchEvent(new CustomEvent("problem-saved"));
            }).catch((error) => {
              console.error("Error saving problem to database:", error);
              // Continue - localStorage is fallback
            });
          } catch (error) {
            console.error("Error importing saveProblem:", error);
            // Continue - localStorage is fallback
          }
        }
        
        // Dispatch event for StudyStreak tracking
        window.dispatchEvent(new CustomEvent("problemStarted"));
        
        // Update last study date for StudyReminder
        localStorage.setItem("aitutor-last-study", Date.now().toString());
        
        // Activate study timer
        setIsStudyActive(true);
      } catch (error) {
        logger.error("Error in background save task", { error });
        // Ignore errors - don't block chat
      }
    })();
    
    // Map problem generation difficulty to chat difficulty mode
    // Check if problem has generatedDifficulty property (from ProblemGenerator)
    const problemWithDifficulty = problem as any;
    if (problemWithDifficulty.generatedDifficulty) {
      const genDifficulty = problemWithDifficulty.generatedDifficulty.toLowerCase();
      // Map generation difficulty to chat difficulty mode
      if (genDifficulty === "elementary") {
        setDifficultyMode("elementary");
      } else if (genDifficulty === "middle school") {
        setDifficultyMode("middle");
      } else if (genDifficulty === "high school") {
        setDifficultyMode("high");
      } else if (genDifficulty === "advanced") {
        setDifficultyMode("advanced");
      }
    }
    
    setIsInitializing(true);
    setSessionId(null);
    setInitialMessages([]);
    setAllMessages([]); // Clear previous messages

    try {
      logger.debug("Starting chat initialization", { problemText: problem.text.substring(0, 50), difficultyMode, hasApiKey: !!settings.apiKey });
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Initialize chat session with problem
      // If problem has an imageUrl (from whiteboard or upload), pass it as whiteboardImage
      // so the AI can see the actual image, not just the extracted text
      const requestBody: any = {
        problem: problem,
        difficultyMode: difficultyMode,
        ...(settings.apiKey && { apiKey: settings.apiKey }), // Only include if defined
        ...(user?.id && { userId: user.id }), // Include user ID for authenticated users (for persistent sessions)
      };
      
      // If problem has an image (from whiteboard drawing or upload), pass it to the AI
      if (problem.imageUrl) {
        // Extract base64 from data URL if needed
        let base64Image: string;
        if (problem.imageUrl.startsWith('data:image')) {
          base64Image = problem.imageUrl.split(",")[1]; // Remove data URL prefix
        } else {
          base64Image = problem.imageUrl; // Already base64
        }
        requestBody.whiteboardImage = base64Image;
        logger.debug("Including problem image in chat initialization", {
          hasImage: true,
          imageUrlLength: problem.imageUrl.length,
        });
      }
      
      logger.debug("Sending chat initialization request", { 
        hasProblem: !!requestBody.problem, 
        difficultyMode: requestBody.difficultyMode,
        hasUserId: !!requestBody.userId,
        hasApiKey: !!requestBody.apiKey 
      });
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      logger.debug("Chat API response received", { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to initialize: ${response.status}`;
        logger.error("Initialization failed", { errorMessage, errorData });
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success) {
        const errorMessage = result.error || "Failed to start conversation";
        logger.error("Initialization failed", { errorMessage, result });
        throw new Error(errorMessage);
      }

      // Verify we have both sessionId and response
      if (!result.sessionId) {
        logger.error("No sessionId in response", { result });
        throw new Error("Server did not return a session ID. Please try again.");
      }

      if (!result.response || !result.response.text) {
        logger.error("No response text in result", { result });
        throw new Error("Server did not return an initial message. Please try again.");
      }

      // Set session ID
      setSessionId(result.sessionId);
      logger.info("Session initialized", { sessionId: result.sessionId });

      // Create initial message from tutor response
      const initialMessage: Message = {
        id: Date.now().toString(),
        role: "tutor",
        content: result.response.text,
        timestamp: result.response.timestamp,
      };
      setInitialMessages([initialMessage]);
      setAllMessages([initialMessage]);
      setIsInitializing(false); // IMPORTANT: Reset initializing state
    } catch (error) {
      logger.error("Error initializing chat", { error: error instanceof Error ? error.message : String(error) });
      
      // Clear any stale session ID
      setSessionId(null);
      setInitialMessages([]);
      setAllMessages([]);
      setIsInitializing(false); // IMPORTANT: Reset initializing state even on error
      
      if (error instanceof Error && error.name === "AbortError") {
        showToast("Request timed out. Please try again.", "error");
      } else if (error instanceof Error) {
        // Show the actual error message to help debug
        const errorMsg = error.message || "Failed to start conversation. Please try again.";
        logger.error("Initialization error details", { errorMsg });
        showToast(errorMsg, "error");
      } else {
        showToast("An unexpected error occurred. Please try again.", "error");
      }
      // Reset on error
      setCurrentProblem(null);
    } finally {
      setIsInitializing(false);
    }
  };

      const handleChangeProblem = () => {
        setCurrentProblem(null);
        setSessionId(null);
        setInitialMessages([]);
        setAllMessages([]);
        setIsStudyActive(false); // Stop timer when changing problem
      };

      // Listen for problem solved events
      useEffect(() => {
        const handleProblemSolved = () => {
          setProblemsSolvedToday((prev) => prev + 1);
          // Dispatch event with problem text so Problem of the Day can verify it matches
          const problemText = currentProblem?.text || "";
          window.dispatchEvent(new CustomEvent("problemSolved", {
            detail: { problemText }
          }));
          // Also dispatch event for ProblemProgress component
          window.dispatchEvent(new CustomEvent("problem_completed", {
            detail: { problemText }
          }));
        };

        // Use the smart completion detector instead of hardcoded phrases
        // This matches what ProblemProgress uses
        if (allMessages.length > 0 && currentProblem) {
          // Import the detector dynamically to avoid SSR issues
          import("@/services/completionDetector").then(({ detectProblemCompletion }) => {
            const result = detectProblemCompletion(allMessages, currentProblem);
            if (result.isCompleted) {
              handleProblemSolved();
            }
          }).catch(() => {
            // Fallback to simple check if import fails
            const tutorMessages = allMessages.filter((m) => m.role === "tutor");
            const isSolved = tutorMessages.some((msg) => {
              const content = msg.content.toLowerCase();
              return (
                content.includes("great job") ||
                content.includes("well done") ||
                content.includes("that's correct") ||
                content.includes("that's right") ||
                (content.includes("correct") && content.includes("answer"))
              );
            });
            if (isSolved) {
              handleProblemSolved();
            }
          });
        }
      }, [allMessages, currentProblem]);

      // Calculate time spent today from study sessions
      useEffect(() => {
        try {
          const sessions = JSON.parse(localStorage.getItem("aitutor-study-sessions") || "[]");
          const today = new Date().toISOString().split("T")[0];
          const todaySessions = sessions.filter((s: any) => {
            const sessionDate = new Date(s.startTime);
            return sessionDate.toISOString().split("T")[0] === today;
          });
          const todayTime = todaySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
          setTimeSpentToday(Math.floor(todayTime / 60)); // Convert to minutes
        } catch {
          // Ignore
        }
      }, [isStudyActive]);

  // Show loading state while auth is initializing or not mounted
  if (!isMounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users (unless guest mode)
  if (!user && showLandingPage && !isGuestMode) {
    return (
      <div suppressHydrationWarning>
        <SkipLink />
        <OfflineIndicator />
        {/* TEMPORARY: Disabled to unblock chat - uses XP hooks that timeout */}
        {/* <SyncingIndicator /> */}
        <PWAInstaller />
        <LandingPage
          onGetStarted={() => {
            setIsGuestMode(true);
            setShowLandingPage(false);
          }}
        />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning>
      <SkipLink />
      <OfflineIndicator />
      <PWAInstaller />
      <WelcomeScreen 
        key="welcome-screen" 
        onGetStarted={() => {
          // Welcome screen dismissed, ready to use app
          logger.debug("Welcome screen onGetStarted callback fired");
        }} 
      />
      {/* Commented out OnboardingTutorial - keeping only WelcomeScreen for now */}
      {/* <OnboardingTutorial /> */}
      <SessionResume onResume={handleResumeSession} />
      <main 
        id="main-content" 
        className="flex min-h-screen flex-col items-center p-3 sm:p-4 md:p-6 lg:p-12 bg-[#fafafa] dark:bg-[#0a0a0a] transition-colors"
        style={{ visibility: isMounted ? 'visible' : 'hidden' }}
      >
        <div className="w-full max-w-5xl overflow-visible">
        {/* Auth Button - Top Right (Fixed position to avoid conflicts) */}
        <div className="fixed top-4 right-4 z-50 mb-4" style={{ 
          top: 'max(1rem, env(safe-area-inset-top, 1rem))',
          right: 'max(1rem, env(safe-area-inset-right, 1rem))',
        }}>
          <AuthButton 
            isGuestMode={isGuestMode && !user} 
            onSignUpClick={() => {
              setAuthModalMode("signup");
              setAuthModalOpen(true);
            }}
          />
        </div>
        
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          {isGuestMode && !user && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                You&apos;re in Guest Mode. Your progress won&apos;t be saved. <button
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthModalMode("signup");
                    setAuthModalOpen(true);
                  }}
                  className="underline hover:no-underline font-semibold"
                >
                  Sign up
                </button> to save your progress.
              </p>
            </div>
          )}
          {isViewingStudent && activeProfile && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                Viewing <span className="font-semibold">{activeProfile.name}&apos;s</span> progress (read-only)
              </p>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-light mb-2 sm:mb-3 text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
            AI Math Tutor
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-light transition-colors">
            Discover solutions through guided questions
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 font-light transition-colors hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded text-xs transition-colors">Enter</kbd> to send messages
          </p>
        </div>

            {!currentProblem ? (
              // Wait for client-side hydration AND profiles to load before rendering conditional content
              // This prevents flash of wrong content during SSR -> client hydration
              // For teachers/parents with stored profile, wait until activeProfile is loaded
              (() => {
                // Check if we have a stored profile ID but activeProfile is not yet fully loaded
                const hasStoredProfile = typeof window !== "undefined" && localStorage.getItem("aitutor-active-profile-id");
                // activeProfile might be a placeholder with name "Loading..." - wait for real profile
                const isPlaceholderProfile = activeProfile?.name === "Loading...";
                const isWaitingForProfile = user && (userRole === "parent" || userRole === "teacher") && hasStoredProfile && (!activeProfile || isPlaceholderProfile);
                return !isMounted || profilesLoading || isWaitingForProfile;
              })() ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : isViewingStudent ? (
                // Monitoring mode - show student quick stats
                <StudentQuickStats
                  studentName={activeProfile?.name || "Student"}
                  profileId={activeProfile?.id || null}
                />
              ) : (
                <div className="space-y-4" data-tutorial="problem-input">
                  <ProblemOfTheDay
                    onProblemSelected={handleProblemParsed}
                    apiKey={settings.apiKey}
                  />
                  <ProblemInput
                    onProblemParsed={handleProblemParsed}
                    apiKey={settings.apiKey}
                  />
                  <ProblemGenerator onProblemGenerated={handleProblemParsed} apiKey={settings.apiKey} />
                </div>
              )
            ) : (
          <div className="space-y-6">
            {/* Problem Display */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 transition-colors">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4">
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide transition-colors">
                    Problem
                  </h2>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <BookmarkButton problem={currentProblem} />
                    <button
                      onClick={handleChangeProblem}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap"
                    >
                      Change
                    </button>
                  </div>
                </div>
                {/* Display uploaded image if available (especially for geometry problems) */}
                {currentProblem.imageUrl && (
                  <div className="mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentProblem.imageUrl}
                      alt="Problem diagram"
                      className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                      style={{ maxHeight: "400px" }}
                    />
                  </div>
                )}
                <div className="text-gray-900 dark:text-gray-100 text-base sm:text-lg leading-relaxed break-words whitespace-pre-wrap transition-colors">
                  <MathRenderer content={normalizeProblemText(currentProblem.text)} />
                </div>
                <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-800 transition-colors">
                  {currentProblem.type && (
                    <span className="inline-block text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide transition-colors">
                      {currentProblem.type.replace("_", " ")}
                    </span>
                  )}
                  <ProblemDifficultyIndicator
                    problemText={currentProblem.text}
                    problemType={currentProblem.type}
                  />
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            {isInitializing ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center transition-colors">
                <div className="flex flex-col items-center justify-center gap-4 text-gray-400 dark:text-gray-500 transition-colors">
                  <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-400 rounded-full animate-spin transition-colors" />
                  <div>
                    <p className="text-sm font-light transition-colors">Initializing conversation</p>
                    <p className="text-xs font-light text-gray-300 dark:text-gray-400 mt-1 transition-colors">Preparing your tutor...</p>
                  </div>
                </div>
              </div>
            ) : sessionId && currentProblem ? (
              <div className="space-y-4">
                {/* Difficulty Mode Selector */}
                <DifficultyModeSelector
                  mode={difficultyMode}
                  onChange={setDifficultyMode}
                />

                {/* Whiteboard is now integrated into ChatUI - toggle button in chat header */}

                {/* Chat Interface */}
                <div data-tutorial="chat">
                  <ChatUI
                    sessionId={sessionId}
                    initialMessages={initialMessages}
                    problem={currentProblem}
                    enableStretchFeatures={true}
                    difficultyMode={difficultyMode}
                    voiceEnabled={settings.voiceEnabled}
                    onMessagesChange={setAllMessages}
                    apiKey={settings.apiKey} // Pass client-provided API key if available
                    onRestart={() => {
                    setSessionId(null);
                    setInitialMessages([]);
                    setAllMessages([]);
                    // Clear saved session
                    try {
                      localStorage.removeItem("aitutor-session");
                      localStorage.removeItem("aitutor-problem");
                      localStorage.removeItem("aitutor-messages");
                    } catch (error) {
                      // Ignore errors
                    }
                    // Re-initialize with same problem
                    if (currentProblem) {
                      handleProblemParsed(currentProblem);
                      }
                    }}
                  />
                </div>

                {/* Auto-save conversation */}
                {sessionId && (
                  <AutoSave
                    messages={allMessages}
                    problem={currentProblem}
                    sessionId={sessionId}
                  />
                )}

                {/* Problem Progress */}
                {sessionId && allMessages.length > 0 && currentProblem && (
                  <ProblemProgress
                    messages={allMessages}
                    problem={currentProblem}
                    difficultyMode={difficultyMode}
                    userId={user?.id}
                    profileId={userRole === "student" ? null : (activeProfile?.id || null)}
                  />
                )}

                {/* Problem Stats */}
                {sessionId && allMessages.length > 0 && settings.showStats && (
                  <ProblemStats
                    messages={allMessages}
                    problemText={currentProblem?.text}
                  />
                )}

                {/* Export, Share & Print */}
                {sessionId && allMessages.length > 0 && (
                  <div className="flex justify-end gap-2 flex-wrap">
                    <PrintView
                      problem={currentProblem}
                      messages={allMessages}
                    />
                    <ShareProblem
                      problem={currentProblem}
                      messages={allMessages}
                    />
                    <ConversationExport
                      messages={allMessages}
                      problem={currentProblem}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-sm text-gray-400 font-light">Initializing</p>
              </div>
            )}
          </div>
        )}
      </div>
      
          {/* Keyboard Shortcuts Help */}

          {/* Toast Notifications */}
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          ))}

          {/* Unified Learning Hub (Dashboard + History + Practice) */}
          <LearningHub 
            key={`learning-hub-${activeProfile?.id || 'none'}`}
            onSelectProblem={handleProblemParsed}
            onDifficultyChange={setDifficultyMode} 
            apiKey={settings.apiKey}
            isGuestMode={isGuestMode && !user}
            onSignUpClick={() => {
              setAuthModalMode("signup");
              setAuthModalOpen(true);
            }}
          />

          {/* Unified Settings Menu (Settings + Notifications) */}
          <SettingsMenu 
            key={`settings-menu-${activeProfile?.id || 'none'}`}
            isGuestMode={isGuestMode && !user}
            onSignUpClick={() => {
              setAuthModalMode("signup");
              setAuthModalOpen(true);
            }}
          />

          {/* Referral Button (only for logged-in users) */}
          {!isGuestMode && user && <ReferralButton />}

          {/* Unified Tools Menu (Search + Tips + Formulas) */}
          <ToolsMenu 
            key={`tools-menu-${activeProfile?.id || 'none'}`}
            onSelectProblem={handleProblemParsed}
            isGuestMode={isGuestMode && !user}
          />

          {/* Unified Progress Hub (Stats + Goals + Timer + Streak) */}
          {/* TEMPORARY: Disabled - uses XP hooks */}
          {/* <ProgressHub
            key={`progress-hub-${activeProfile?.id || 'none'}`}
            isStudyActive={isStudyActive}
            problemsSolvedToday={problemsSolvedToday}
            timeSpentToday={timeSpentToday}
            onStreakChange={setStreak}
            isGuestMode={isGuestMode && !user}
            onSignUpClick={() => {
              setAuthModalMode("signup");
              setAuthModalOpen(true);
            }}
          />

          {/* XP System (hidden - tracking only, UI is in SettingsMenu) */}
          <div className="hidden">
            {/* TEMPORARY: Disabled - uses XP hooks */}
            {/* <XPSystem 
              messages={allMessages} 
              problem={currentProblem}
              onLevelUp={(newLevel) => {
                showToast(`🎉 Level Up! You reached Level ${newLevel}!`, "success");
                // Sound is already played in XPSystem component
              }}
              onXPDataChange={(data) => {
                // Only update if values actually changed to prevent infinite loops
                setXPData((prev) => {
                  if (
                    prev.totalXP !== data.totalXP ||
                    prev.level !== data.level ||
                    prev.problemsSolved !== data.problemsSolved
                  ) {
                    return data;
                  }
                  return prev;
                });
              }}
            /> */}
          </div>

          {/* Unified Gamification Hub (Achievements + Leaderboard) */}
          <GamificationHub
            key={`gamification-hub-${activeProfile?.id || 'none'}`}
            currentXP={xpData.totalXP}
            currentLevel={xpData.level}
            currentProblemsSolved={xpData.problemsSolved}
            currentStreak={streak}
            isGuestMode={isGuestMode && !user}
            onSignUpClick={() => {
              setAuthModalMode("signup");
              setAuthModalOpen(true);
            }}
            onXPDataChange={(data) => {
              setXPData((prev) => {
                if (
                  prev.totalXP !== data.totalXP ||
                  prev.level !== data.level ||
                  prev.problemsSolved !== data.problemsSolved
                ) {
                  return {
                    ...prev,
                    totalXP: data.totalXP,
                    level: data.level,
                    problemsSolved: data.problemsSolved,
                  };
                }
                return prev;
              });
            }}
          />

          {/* Study Reminders (hidden - UI is in SettingsMenu) */}
          <div className="hidden">
            <StudyReminder />
          </div>

          {/* Problem Suggestions (hidden - UI is in LearningHub) */}
          <div className="hidden">
            <ProblemSuggestions onSelectProblem={handleProblemParsed} />
          </div>

          {/* StudyTimer (hidden - UI is in ProgressHub) */}
          <div className="hidden">
            <StudyTimer isActive={isStudyActive} />
          </div>

          {/* DailyGoals (hidden - UI is in ProgressHub) */}
          <div className="hidden">
            <DailyGoals 
              problemsSolvedToday={problemsSolvedToday} 
              timeSpentToday={timeSpentToday} 
            />
          </div>



          {/* Notification Center (background logic only - UI is in SettingsMenu) */}
          <NotificationCenter hideButton={true} />
        </main>
        {/* Auth Modal for guest mode */}
        {isGuestMode && !user && (
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            initialMode={authModalMode}
          />
        )}
      </div>
    );
  }

// Wrap HomeContent with AuthProvider
export default function Home() {
  // Always render the same initial structure to avoid hydration mismatches
  return (
    <div suppressHydrationWarning>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }>
        <AuthProvider>
          <PanelProvider>
            <HomeContentInternal />
          </PanelProvider>
        </AuthProvider>
      </Suspense>
    </div>
  );
}
