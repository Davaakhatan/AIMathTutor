"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";
import MessageComponent from "./Message";
import MessageInput from "./MessageInput";
import { sanitizeInput, formatErrorMessage, isRetryableError, delay } from "@/lib/utils";

interface ChatUIProps {
  sessionId: string;
  initialMessages?: Message[];
  onRestart?: () => void;
}

export default function ChatUI({ sessionId, initialMessages = [], onRestart }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Sanitize input
    const sanitizedMessage = sanitizeInput(message, 1000);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: sanitizedMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Retry logic
    let lastError: Error | null = null;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            message: sanitizedMessage,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || 
            `Server error: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();

        if (result.success && result.response) {
          const tutorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "tutor",
            content: result.response.text,
            timestamp: result.response.timestamp,
          };

          setMessages((prev) => [...prev, tutorMessage]);
          return; // Success, exit retry loop
        } else {
          throw new Error(result.error || "Failed to get response from tutor");
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Unknown error");
        
        // Check if it's a retryable error
        const isRetryable = isRetryableError(err);

        // If last attempt or not retryable, show error
        if (attempt === maxRetries || !isRetryable) {
          setError(formatErrorMessage(err));
          break;
        }
        
        // Wait before retry (exponential backoff)
        await delay(attempt);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[500px] sm:max-h-[600px] bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header with restart button */}
      {onRestart && messages.length > 0 && (
        <div className="border-b border-gray-200 px-4 py-2 flex justify-end">
          <button
            onClick={onRestart}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-light"
          >
            Restart conversation
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8 sm:py-12">
            <p className="text-sm font-light">Start the conversation</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <MessageComponent message={message} />
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-gray-400 animate-in fade-in">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <span className="text-sm font-light">Tutor is thinking...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-red-700 font-medium flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 transition-colors"
                aria-label="Dismiss error"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  );
}

