"use client";

import { useState, useEffect } from "react";
import ProblemInput from "@/components/ProblemInput";
import ChatUI from "@/components/chat/ChatUI";
import Whiteboard from "@/components/stretch/Whiteboard";
import DifficultyModeSelector from "@/components/stretch/DifficultyModeSelector";
import ConversationExport from "@/components/ConversationExport";
import ProblemGenerator from "@/components/ProblemGenerator";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import AutoSave from "@/components/AutoSave";
import ProblemStats from "@/components/ProblemStats";
import SkipLink from "@/components/SkipLink";
import OfflineIndicator from "@/components/OfflineIndicator";
import ToolsMenu from "@/components/unified/ToolsMenu";
import LearningHub from "@/components/unified/LearningHub";
import ShareProblem from "@/components/ShareProblem";
import BookmarkButton from "@/components/BookmarkButton";
import SettingsMenu from "@/components/unified/SettingsMenu";
import StudyStreak from "@/components/StudyStreak";
import PrintView from "@/components/PrintView";
import ProblemDifficultyIndicator from "@/components/ProblemDifficultyIndicator";
import StudyReminder from "@/components/StudyReminder";
import ProblemSuggestions from "@/components/ProblemSuggestions";
import SessionResume from "@/components/SessionResume";
import ProblemProgress from "@/components/ProblemProgress";
import ProblemOfTheDay from "@/components/ProblemOfTheDay";
import XPSystem from "@/components/XPSystem";
import GamificationHub from "@/components/unified/GamificationHub";
import StudyTimer from "@/components/StudyTimer";
import DailyGoals from "@/components/DailyGoals";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import NotificationCenter from "@/components/NotificationCenter";
import ProgressHub from "@/components/unified/ProgressHub";
import WelcomeScreen from "@/components/WelcomeScreen";
import { ParsedProblem, Message } from "@/types";
import { normalizeProblemText } from "@/lib/textUtils";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
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
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const { toasts, showToast, removeToast } = useToast();
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

  // Handle session resume
  const handleResumeSession = (problem: ParsedProblem, messages: Message[], sessionId: string) => {
    setCurrentProblem(problem);
    setSessionId(sessionId);
    setInitialMessages(messages);
    setAllMessages(messages);
    showToast("Session resumed!", "success");
  };

  const handleProblemParsed = async (problem: ParsedProblem) => {
    // Auto-save to history
    try {
      const history = JSON.parse(localStorage.getItem("aitutor-problem-history") || "[]");
      const newProblem = {
        ...problem,
        id: Date.now().toString(),
        savedAt: Date.now(),
      };
      const updatedHistory = [newProblem, ...history.filter((p: any) => p.text !== problem.text)].slice(0, 20);
      localStorage.setItem("aitutor-problem-history", JSON.stringify(updatedHistory));
      
      // Dispatch event for StudyStreak tracking
      window.dispatchEvent(new CustomEvent("problemStarted"));
      
      // Update last study date for StudyReminder
      localStorage.setItem("aitutor-last-study", Date.now().toString());
      
      // Activate study timer
      setIsStudyActive(true);
    } catch (error) {
      // Ignore errors
    }

    setCurrentProblem(problem);
    
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

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Initialize chat session with problem
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problem: problem,
          difficultyMode: difficultyMode,
          ...(settings.apiKey && { apiKey: settings.apiKey }), // Only include if defined
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to initialize: ${response.status}`;
        console.error("Initialization failed:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success) {
        const errorMessage = result.error || "Failed to start conversation";
        console.error("Initialization failed:", errorMessage, result);
        throw new Error(errorMessage);
      }

      // Verify we have both sessionId and response
      if (!result.sessionId) {
        console.error("No sessionId in response:", result);
        throw new Error("Server did not return a session ID. Please try again.");
      }

      if (!result.response || !result.response.text) {
        console.error("No response text in result:", result);
        throw new Error("Server did not return an initial message. Please try again.");
      }

      // Set session ID
      setSessionId(result.sessionId);
      console.log("Session initialized:", result.sessionId);

      // Create initial message from tutor response
      const initialMessage: Message = {
        id: Date.now().toString(),
        role: "tutor",
        content: result.response.text,
        timestamp: result.response.timestamp,
      };
      setInitialMessages([initialMessage]);
      setAllMessages([initialMessage]);
    } catch (error) {
      console.error("Error initializing chat:", error);
      
      // Clear any stale session ID
      setSessionId(null);
      setInitialMessages([]);
      setAllMessages([]);
      
      if (error instanceof Error && error.name === "AbortError") {
        showToast("Request timed out. Please try again.", "error");
      } else if (error instanceof Error) {
        // Show the actual error message to help debug
        const errorMsg = error.message || "Failed to start conversation. Please try again.";
        console.error("Initialization error details:", errorMsg);
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
          window.dispatchEvent(new CustomEvent("problemSolved"));
        };

        // Check if problem is solved by looking at messages
        const tutorMessages = allMessages.filter((m) => m.role === "tutor");
        const isSolved = tutorMessages.some((msg) => {
          const content = msg.content.toLowerCase();
          const completionPhrases = [
            "you've solved it",
            "you solved it",
            "solution is correct",
            "answer is correct",
            "congratulations",
            "well done",
            "excellent",
            "perfect",
            "correct!",
            "that's right",
            "that is correct",
            "you got it",
            "you got it right",
            "great job",
          ];
          return completionPhrases.some((phrase) => content.includes(phrase));
        });

        if (isSolved && currentProblem) {
          handleProblemSolved();
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

  return (
    <>
      <SkipLink />
      <OfflineIndicator />
      <WelcomeScreen 
        key="welcome-screen" 
        onGetStarted={() => {
          // Welcome screen dismissed, ready to use app
          console.log("Welcome screen onGetStarted callback fired");
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
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
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
                    <img
                      src={currentProblem.imageUrl}
                      alt="Problem diagram"
                      className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                      style={{ maxHeight: "400px" }}
                    />
                  </div>
                )}
                <div className="text-gray-900 dark:text-gray-100 text-base sm:text-lg leading-relaxed break-words whitespace-pre-wrap transition-colors">
                  {normalizeProblemText(currentProblem.text)}
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
            ) : sessionId ? (
              <div className="space-y-4">
                {/* Difficulty Mode Selector */}
                <DifficultyModeSelector
                  mode={difficultyMode}
                  onChange={setDifficultyMode}
                />

                {/* Whiteboard */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors font-light px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
                    aria-label={showWhiteboard ? "Hide whiteboard" : "Show whiteboard"}
                  >
                    {showWhiteboard ? "Hide" : "Show"} Whiteboard
                  </button>
                </div>

                {showWhiteboard && (
                  <Whiteboard isEnabled={true} />
                )}

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
            onSelectProblem={handleProblemParsed} 
            apiKey={settings.apiKey}
          />

          {/* Unified Settings Menu (Settings + Notifications + XP) */}
          <SettingsMenu 
            onXPDataChange={(data) => {
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
          />

          {/* Unified Tools Menu (Search + Tips + Formulas) */}
          <ToolsMenu onSelectProblem={handleProblemParsed} />

          {/* Unified Progress Hub (Stats + Goals + Timer + Streak) */}
          <ProgressHub
            isStudyActive={isStudyActive}
            problemsSolvedToday={problemsSolvedToday}
            timeSpentToday={timeSpentToday}
            onStreakChange={setStreak}
          />

          {/* XP System (hidden - tracking only, UI is in SettingsMenu) */}
          <div className="hidden">
            <XPSystem 
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
            />
          </div>

          {/* Unified Gamification Hub (Achievements + Leaderboard) */}
          <GamificationHub
            currentXP={xpData.totalXP}
            currentLevel={xpData.level}
            currentProblemsSolved={xpData.problemsSolved}
            currentStreak={streak}
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
      </>
    );
  }
