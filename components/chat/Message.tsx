"use client";

import { memo, useRef } from "react";
import { Message as MessageType } from "@/types";
import EnhancedMessageRenderer from "./EnhancedMessageRenderer";
import MessageActions from "../MessageActions";
import ExampleDrawing from "./ExampleDrawing";
import DrawingSuggestions from "./DrawingSuggestions";
import VoiceVisualSync from "./VoiceVisualSync";
import { DrawingSuggestion } from "../ai/DrawingSuggestionParser";
import { VisualUpdate } from "@/lib/visualSyncManager";

interface MessageProps {
  message: MessageType;
  onSuggestionClick?: (suggestion: DrawingSuggestion) => void;
  enableStretchFeatures?: boolean;
  whiteboardRef?: React.RefObject<HTMLCanvasElement>;
  voiceSyncEnabled?: boolean;
}

function Message({ 
  message, 
  onSuggestionClick, 
  enableStretchFeatures = true,
  whiteboardRef,
  voiceSyncEnabled = false,
}: MessageProps) {
  const isUser = message.role === "user";

  const messageRef = useRef<HTMLDivElement>(null);
  
  const handleVisualUpdate = (update: VisualUpdate) => {
    // Handle visual updates from voice synchronization
    if (update.type === "highlight" && messageRef.current) {
      // Add highlight effect to message
      messageRef.current.classList.add("voice-sync-highlight");
      setTimeout(() => {
        messageRef.current?.classList.remove("voice-sync-highlight");
      }, update.duration || 3000);
    }
  };
  
  return (
    <div
      ref={messageRef}
      data-message-id={message.id}
      className={`flex ${isUser ? "justify-end" : "justify-start"} group`}
    >
      {!isUser && voiceSyncEnabled && (
        <VoiceVisualSync
          message={message}
          onVisualUpdate={handleVisualUpdate}
          whiteboardRef={whiteboardRef}
          isEnabled={enableStretchFeatures}
        />
      )}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 transition-all relative overflow-hidden ${
          isUser
            ? "bg-gray-900 dark:bg-gray-800 text-white"
            : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 text-sm leading-relaxed font-light min-w-0">
            <EnhancedMessageRenderer content={message.content} isUser={isUser} />
            {!isUser && <ExampleDrawing message={message.content} />}
            {!isUser && enableStretchFeatures && (
              <DrawingSuggestions 
                message={message.content} 
                onSuggestionClick={onSuggestionClick}
              />
            )}
          </div>
          <MessageActions content={message.content} />
        </div>
        {message.timestamp && (
          <div
            className={`text-xs mt-2 font-light ${
              isUser ? "text-gray-400 dark:text-gray-500" : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(Message);

