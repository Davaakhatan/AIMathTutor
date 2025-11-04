"use client";

import { Message } from "@/types";

interface ProblemStatsProps {
  messages: Message[];
  problemText?: string;
}

/**
 * Display statistics about the conversation
 */
export default function ProblemStats({ messages, problemText }: ProblemStatsProps) {
  const userMessages = messages.filter((m) => m.role === "user");
  const tutorMessages = messages.filter((m) => m.role === "tutor");
  const totalExchanges = Math.min(userMessages.length, tutorMessages.length);
  const conversationDuration = messages.length > 0
    ? Math.round((Date.now() - (messages[0]?.timestamp || Date.now())) / 1000 / 60)
    : 0;
  
  // Calculate average response time (rough estimate)
  const avgWordsPerMessage = messages.length > 0
    ? messages.reduce((acc, m) => acc + m.content.split(" ").length, 0) / messages.length
    : 0;

  if (messages.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{totalExchanges} exchanges</span>
        </div>
        {conversationDuration > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{conversationDuration} min</span>
          </div>
        )}
        {avgWordsPerMessage > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{Math.round(avgWordsPerMessage)} words/msg</span>
          </div>
        )}
      </div>
    </div>
  );
}

