"use client";

import { useState, KeyboardEvent, useCallback } from "react";
import { sanitizeInput } from "@/lib/utils";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function MessageInput({
  onSendMessage,
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      // Sanitize input before sending
      const sanitized = sanitizeInput(trimmed, 1000);
      if (sanitized) {
        onSendMessage(sanitized);
        setMessage("");
      }
    }
  }, [message, disabled, onSendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 p-3 sm:p-4 bg-white"
    >
      <div className="flex gap-2 sm:gap-3">
        <textarea
          value={message}
          onChange={(e) => {
            const value = e.target.value;
            // Limit to 1000 characters
            if (value.length <= 1000) {
              setMessage(value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type your response..."
          disabled={disabled}
          rows={2}
          maxLength={1000}
          className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 resize-none text-gray-900 placeholder-gray-400 font-light text-sm"
          aria-label="Message input"
          aria-describedby="char-count"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap font-medium text-sm"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-400 font-light hidden sm:block">
          Press Enter to send
        </p>
        {message.length > 0 && (
          <p 
            id="char-count"
            className={`text-xs font-light ${
              message.length > 900 ? "text-orange-500" : "text-gray-400"
            }`}
          >
            {message.length}/1000
          </p>
        )}
      </div>
    </form>
  );
}

