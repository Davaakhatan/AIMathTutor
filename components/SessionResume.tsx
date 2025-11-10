"use client";

import { useState, useEffect } from "react";
import { ParsedProblem, Message } from "@/types";

interface SavedSession {
  sessionId: string;
  timestamp: number;
}

interface SessionResumeProps {
  onResume: (problem: ParsedProblem, messages: Message[], sessionId: string) => void;
}

/**
 * Component to resume previous sessions
 * Shows a prompt if a recent session is found
 * TEMPORARILY DISABLED - will fix session management later
 */
export default function SessionResume({ onResume }: SessionResumeProps) {
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [savedProblem, setSavedProblem] = useState<ParsedProblem | null>(null);
  const [savedMessages, setSavedMessages] = useState<Message[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // TEMPORARILY DISABLED - causing issues with cross-user sessions
    // Will be re-enabled with proper user scoping
    return;
    
    try {
      const sessionData = localStorage.getItem("aitutor-session");
      const problemData = localStorage.getItem("aitutor-problem");
      const messagesData = localStorage.getItem("aitutor-messages");

      if (sessionData && problemData && messagesData) {
        const session = JSON.parse(sessionData || "null") as any;
        const problem = JSON.parse(problemData || "null") as any;
        const messages = JSON.parse(messagesData || "[]") as any[];
        
        if (!session || !problem || !messages) return;

        // Check if session is recent (within 2 hours)
        const sessionAge = Date.now() - session.timestamp;
        if (sessionAge < 2 * 60 * 60 * 1000 && messages.length > 0) {
          setSavedSession(session);
          setSavedProblem(problem);
          setSavedMessages(messages);
          setShowPrompt(true);
        } else {
          // Clear old session
          localStorage.removeItem("aitutor-session");
          localStorage.removeItem("aitutor-problem");
          localStorage.removeItem("aitutor-messages");
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }, []);

  const handleResume = () => {
    if (savedProblem && savedMessages.length > 0 && savedSession) {
      onResume(savedProblem, savedMessages, savedSession.sessionId);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Clear saved session
    localStorage.removeItem("aitutor-session");
    localStorage.removeItem("aitutor-problem");
    localStorage.removeItem("aitutor-messages");
  };

  if (!showPrompt || !savedProblem) return null;

  const sessionAge = Math.round((Date.now() - savedSession!.timestamp) / 1000 / 60);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 transition-colors">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 transition-colors">
          Resume Previous Session?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 transition-colors">
          We found a previous conversation from {sessionAge} minute{sessionAge !== 1 ? "s" : ""} ago with{" "}
          {savedMessages.length} message{savedMessages.length !== 1 ? "s" : ""}. Would you like to continue where you left off?
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4 transition-colors">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 transition-colors">Problem:</p>
          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2 transition-colors">
            {savedProblem.text}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResume}
            className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
          >
            Resume Session
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
          >
            Start New
          </button>
        </div>
      </div>
    </div>
  );
}

