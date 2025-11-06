"use client";

import { useEffect, useState, useRef } from "react";
import { Message } from "@/types";
import { analyzeSentiment, analyzeConversationHistory, getEncouragementMessage } from "@/services/sentimentAnalyzer";

interface EmotionalSupportProps {
  messages: Message[];
  onCelebrate?: () => void;
}

/**
 * Component that provides visual emotional support based on student sentiment
 */
export default function EmotionalSupport({ messages, onCelebrate }: EmotionalSupportProps) {
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState<string | null>(null);
  const lastProcessedMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (messages.length === 0) return;

    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    if (!lastUserMessage) return;

    // Only process if this is a new message (prevent infinite loops)
    if (lastProcessedMessageIdRef.current === lastUserMessage.id) {
      return;
    }

    lastProcessedMessageIdRef.current = lastUserMessage.id;

    const sentiment = analyzeSentiment(lastUserMessage.content);
    const conversationHistory = analyzeConversationHistory(messages);

    // Show celebration for confident or encouraged sentiment
    if (sentiment.type === "confident" || sentiment.type === "encouraged") {
      setCelebrationVisible(true);
      onCelebrate?.();
      setTimeout(() => setCelebrationVisible(false), 3000);
    }

    // Show encouragement message for frustration or confusion
    if (sentiment.type === "frustrated" || sentiment.type === "confused" || conversationHistory.encouragementNeeded) {
      const message = getEncouragementMessage(sentiment, messages);
      if (message) {
        setEncouragementMessage(message);
        setTimeout(() => setEncouragementMessage(null), 5000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]); // Only depend on length, not the entire messages array

  if (!celebrationVisible && !encouragementMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      {celebrationVisible && (
        <div className="animate-bounce bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-4 py-2 rounded-lg shadow-lg border border-green-300 dark:border-green-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <span className="font-medium">Great progress!</span>
          </div>
        </div>
      )}
      
      {encouragementMessage && (
        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg shadow-lg border border-blue-300 dark:border-blue-700 max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">💪</span>
            <span className="text-sm">{encouragementMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

