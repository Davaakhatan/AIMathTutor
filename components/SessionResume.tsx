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
 */
export default function SessionResume({ onResume }: SessionResumeProps) {
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [savedProblem, setSavedProblem] = useState<ParsedProblem | null>(null);
  const [savedMessages, setSavedMessages] = useState<Message[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    try {
      const sessionData = localStorage.getItem("aitutor-session");
      const problemData = localStorage.getItem("aitutor-problem");
      const messagesData = localStorage.getItem("aitutor-messages");

      if (sessionData && problemData && messagesData) {
        const session = JSON.parse(sessionData);
        const problem = JSON.parse(problemData);
        const messages = JSON.parse(messagesData);

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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Resume Previous Session?
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          We found a previous conversation from {sessionAge} minute{sessionAge !== 1 ? "s" : ""} ago with{" "}
          {savedMessages.length} message{savedMessages.length !== 1 ? "s" : ""}. Would you like to continue where you left off?
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">Problem:</p>
          <p className="text-sm text-gray-900 line-clamp-2">
            {savedProblem.text}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResume}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
          >
            Resume Session
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Start New
          </button>
        </div>
      </div>
    </div>
  );
}

