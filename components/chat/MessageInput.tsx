"use client";

import { useState, KeyboardEvent } from "react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function MessageInput({
  onSendMessage,
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

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
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response..."
          disabled={disabled}
          rows={2}
          className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 resize-none text-gray-900 placeholder-gray-400 font-light text-sm"
          aria-label="Message input"
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
      <p className="text-xs text-gray-400 mt-2 font-light hidden sm:block">
        Press Enter to send
      </p>
    </form>
  );
}

