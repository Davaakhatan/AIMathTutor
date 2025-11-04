"use client";

import { Message as MessageType } from "@/types";
import MathRenderer from "../math/MathRenderer";

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 transition-all ${
          isUser
            ? "bg-gray-900 text-white"
            : "bg-gray-50 text-gray-900 border border-gray-200"
        }`}
      >
        <div className="text-sm leading-relaxed font-light">
          <MathRenderer content={message.content} />
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

