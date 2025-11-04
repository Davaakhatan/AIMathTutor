"use client";

import { memo } from "react";
import { Message as MessageType } from "@/types";
import MathRenderer from "../math/MathRenderer";
import MessageActions from "../MessageActions";

interface MessageProps {
  message: MessageType;
}

function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} group`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 transition-all relative ${
          isUser
            ? "bg-gray-900 text-white"
            : "bg-gray-50 text-gray-900 border border-gray-200"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 text-sm leading-relaxed font-light">
            <MathRenderer content={message.content} />
          </div>
          <MessageActions content={message.content} />
        </div>
        {message.timestamp && (
          <div
            className={`text-xs mt-2 font-light ${
              isUser ? "text-gray-400" : "text-gray-400"
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

