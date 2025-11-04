"use client";

import { useEffect, useRef } from "react";
import { Message, ParsedProblem } from "@/types";

interface AutoSaveProps {
  messages: Message[];
  problem: ParsedProblem | null;
  sessionId: string | null;
}

/**
 * Auto-save conversation to localStorage
 * Allows users to resume conversations if they refresh the page
 */
export default function AutoSave({
  messages,
  problem,
  sessionId,
}: AutoSaveProps) {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!sessionId || messages.length === 0) {
      // Clear saved data if no active session
      if (hasInitialized.current) {
        localStorage.removeItem("aitutor-session");
        localStorage.removeItem("aitutor-problem");
        localStorage.removeItem("aitutor-messages");
      }
      return;
    }

    // Save to localStorage
    try {
      const sessionData = {
        sessionId,
        timestamp: Date.now(),
      };

      localStorage.setItem("aitutor-session", JSON.stringify(sessionData));
      if (problem) {
        localStorage.setItem("aitutor-problem", JSON.stringify(problem));
      }
      localStorage.setItem("aitutor-messages", JSON.stringify(messages));
      hasInitialized.current = true;
    } catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  }, [messages, problem, sessionId]);

  return null; // This component doesn't render anything
}

