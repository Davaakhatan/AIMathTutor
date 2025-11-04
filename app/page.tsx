"use client";

import { useState, useEffect } from "react";
import ProblemInput from "@/components/ProblemInput";
import ChatUI from "@/components/chat/ChatUI";
import Whiteboard from "@/components/stretch/Whiteboard";
import DifficultyModeSelector from "@/components/stretch/DifficultyModeSelector";
import KeyboardShortcutsHelp from "@/components/KeyboardShortcutsHelp";
import ConversationExport from "@/components/ConversationExport";
import ProblemGenerator from "@/components/ProblemGenerator";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import AutoSave from "@/components/AutoSave";
import ProblemStats from "@/components/ProblemStats";
import SkipLink from "@/components/SkipLink";
import OfflineIndicator from "@/components/OfflineIndicator";
import HelpfulTips from "@/components/HelpfulTips";
import ProblemHistory from "@/components/ProblemHistory";
import FormulaReference from "@/components/FormulaReference";
import PracticeMode from "@/components/PracticeMode";
import LearningDashboard from "@/components/LearningDashboard";
import ShareProblem from "@/components/ShareProblem";
import BookmarkButton from "@/components/BookmarkButton";
import Settings from "@/components/Settings";
import StudyStreak from "@/components/StudyStreak";
import PrintView from "@/components/PrintView";
import SearchProblems from "@/components/SearchProblems";
import { ParsedProblem, Message } from "@/types";
import { normalizeProblemText } from "@/lib/textUtils";

export default function Home() {
  const [currentProblem, setCurrentProblem] = useState<ParsedProblem | null>(
    null
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [difficultyMode, setDifficultyMode] = useState<"elementary" | "middle" | "high" | "advanced">("middle");
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const { toasts, showToast, removeToast } = useToast();
  const [settings, setSettings] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("aitutor-settings");
        return saved ? JSON.parse(saved) : { showStats: true, voiceEnabled: true };
      } catch {
        return { showStats: true, voiceEnabled: true };
      }
    }
    return { showStats: true, voiceEnabled: true };
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

  // Load saved session on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("aitutor-session");
      const savedProblem = localStorage.getItem("aitutor-problem");
      const savedMessages = localStorage.getItem("aitutor-messages");

      if (savedSession && savedProblem && savedMessages) {
        const sessionData = JSON.parse(savedSession);
        const problemData = JSON.parse(savedProblem);
        const messagesData = JSON.parse(savedMessages);

        // Check if session is recent (within 1 hour)
        const sessionAge = Date.now() - sessionData.timestamp;
        if (sessionAge < 60 * 60 * 1000) {
          // Optionally restore session - for now, just show a toast
          showToast("Previous session found. Start a new problem to begin.", "info", 5000);
        }
      }
    } catch (error) {
      // Ignore localStorage errors
      console.warn("Failed to load saved session:", error);
    }
  }, [showToast]);

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
    } catch (error) {
      // Ignore errors
    }

    setCurrentProblem(problem);
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
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to initialize: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Set session ID if provided
        if (result.sessionId) {
          setSessionId(result.sessionId);
        }

        // Create initial message from tutor response
        if (result.response) {
          const initialMessage: Message = {
            id: Date.now().toString(),
            role: "tutor",
            content: result.response.text,
            timestamp: result.response.timestamp,
          };
          setInitialMessages([initialMessage]);
          setAllMessages([initialMessage]);
        }
      } else {
        throw new Error(result.error || "Failed to start conversation");
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
      if (error instanceof Error && error.name === "AbortError") {
        showToast("Request timed out. Please try again.", "error");
      } else if (error instanceof Error) {
        showToast(error.message || "Failed to start conversation. Please try again.", "error");
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
  };

  return (
    <>
      <SkipLink />
      <OfflineIndicator />
      <main id="main-content" className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-12 bg-[#fafafa]">
        <div className="w-full max-w-4xl">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-light mb-2 sm:mb-3 text-gray-900 tracking-tight">
            AI Math Tutor
          </h1>
          <p className="text-gray-500 text-sm sm:text-base font-light">
            Discover solutions through guided questions
          </p>
          <p className="text-gray-400 text-xs mt-2 font-light">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send messages
          </p>
        </div>

        {!currentProblem ? (
          <div className="space-y-4">
            <ProblemInput onProblemParsed={handleProblemParsed} />
            <ProblemGenerator onProblemGenerated={handleProblemParsed} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Problem Display */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Problem
                  </h2>
                  <p className="text-gray-900 text-lg leading-relaxed mb-2">
                    {normalizeProblemText(currentProblem.text)}
                  </p>
                  {currentProblem.type && (
                    <span className="inline-block text-xs text-gray-400 font-medium uppercase tracking-wide">
                      {currentProblem.type.replace("_", " ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <BookmarkButton problem={currentProblem} />
                  <button
                    onClick={handleChangeProblem}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            {isInitializing ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <div className="flex flex-col items-center justify-center gap-4 text-gray-400">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  <div>
                    <p className="text-sm font-light">Initializing conversation</p>
                    <p className="text-xs font-light text-gray-300 mt-1">Preparing your tutor...</p>
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
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-light px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                    aria-label={showWhiteboard ? "Hide whiteboard" : "Show whiteboard"}
                  >
                    {showWhiteboard ? "Hide" : "Show"} Whiteboard
                  </button>
                </div>

                {showWhiteboard && (
                  <Whiteboard isEnabled={true} />
                )}

                {/* Chat Interface */}
                    <ChatUI 
                      sessionId={sessionId} 
                      initialMessages={initialMessages}
                      problem={currentProblem}
                      enableStretchFeatures={true}
                      difficultyMode={difficultyMode}
                      voiceEnabled={settings.voiceEnabled}
                      onMessagesChange={setAllMessages}
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

                {/* Auto-save conversation */}
                {sessionId && (
                  <AutoSave
                    messages={allMessages}
                    problem={currentProblem}
                    sessionId={sessionId}
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
          <KeyboardShortcutsHelp />

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

          {/* Helpful Tips */}
          <HelpfulTips />

          {/* Problem History */}
          <ProblemHistory onSelectProblem={handleProblemParsed} />

          {/* Formula Reference */}
          <FormulaReference />

          {/* Practice Mode */}
          <PracticeMode onStartPractice={handleProblemParsed} />

          {/* Learning Dashboard */}
          <LearningDashboard />

          {/* Settings */}
          <Settings />

          {/* Study Streak */}
          <StudyStreak />

          {/* Search Problems */}
          <SearchProblems onSelectProblem={handleProblemParsed} />
        </main>
      </>
    );
  }
