"use client";

import { useState, useEffect } from "react";
import ProblemInput from "@/components/ProblemInput";
import ChatUI from "@/components/chat/ChatUI";
import { ParsedProblem, Message } from "@/types";

export default function Home() {
  const [currentProblem, setCurrentProblem] = useState<ParsedProblem | null>(
    null
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleProblemParsed = async (problem: ParsedProblem) => {
    setCurrentProblem(problem);
    setIsInitializing(true);

    try {
      // Initialize chat session with problem
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problem: problem,
          // sessionId and message not needed for initialization
        }),
      });

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
        }
      } else {
        console.error("Failed to initialize chat:", result.error);
        alert("Failed to start conversation. Please try again.");
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
      alert("An error occurred. Please check your OpenAI API key and try again.");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleChangeProblem = () => {
    setCurrentProblem(null);
    setSessionId(null);
    setInitialMessages([]);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-12 bg-[#fafafa]">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-light mb-2 sm:mb-3 text-gray-900 tracking-tight">
            AI Math Tutor
          </h1>
          <p className="text-gray-500 text-sm sm:text-base font-light">
            Discover solutions through guided questions
          </p>
        </div>

        {!currentProblem ? (
          <ProblemInput onProblemParsed={handleProblemParsed} />
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
                    {currentProblem.text}
                  </p>
                  {currentProblem.type && (
                    <span className="inline-block text-xs text-gray-400 font-medium uppercase tracking-wide">
                      {currentProblem.type.replace("_", " ")}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleChangeProblem}
                  className="ml-4 text-sm text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Chat Interface */}
            {isInitializing ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <div className="flex items-center justify-center gap-3 text-gray-400">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  <span className="text-sm font-light">Initializing conversation</span>
                </div>
              </div>
            ) : sessionId ? (
              <ChatUI 
                sessionId={sessionId} 
                initialMessages={initialMessages}
                onRestart={() => {
                  setSessionId(null);
                  setInitialMessages([]);
                  // Re-initialize with same problem
                  if (currentProblem) {
                    handleProblemParsed(currentProblem);
                  }
                }}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-sm text-gray-400 font-light">Initializing</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
