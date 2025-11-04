"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";
import MessageComponent from "./Message";
import MessageInput from "./MessageInput";

interface ChatUIProps {
  sessionId: string;
  initialMessages?: Message[];
}

export default function ChatUI({ sessionId, initialMessages = [] }: ChatUIProps) {
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

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message,
        }),
      });

      const result = await response.json();

      if (result.success && result.response) {
        const tutorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "tutor",
          content: result.response.text,
          timestamp: result.response.timestamp,
        };

        setMessages((prev) => [...prev, tutorMessage]);
      } else {
        setError(result.error || "Failed to get response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[500px] sm:max-h-[600px] bg-white border border-gray-200 rounded-lg overflow-hidden">
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
            <span className="text-sm font-light">Thinking</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-700 font-medium">{error}</p>
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

