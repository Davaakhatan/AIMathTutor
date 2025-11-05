"use client";

import { useCallback, useState } from "react";
import { Message, ParsedProblem } from "@/types";

interface ConversationExportProps {
  messages: Message[];
  problem: ParsedProblem | null;
}

export default function ConversationExport({
  messages,
  problem,
}: ConversationExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportConversation = useCallback(() => {
    if (messages.length === 0) return;

    setIsExporting(true);

    try {
      let content = "AI Math Tutor - Conversation Export\n";
      content += "=".repeat(50) + "\n\n";

      if (problem) {
        content += `Problem: ${problem.text}\n`;
        if (problem.type) {
          content += `Type: ${problem.type.replace("_", " ")}\n`;
        }
        content += "\n";
      }

      content += "Conversation:\n";
      content += "-".repeat(50) + "\n\n";

      messages.forEach((message) => {
        const role = message.role === "user" ? "Student" : "Tutor";
        const timestamp = message.timestamp
          ? new Date(message.timestamp).toLocaleString()
          : "";
        content += `[${role}] ${timestamp}\n`;
        content += `${message.content}\n\n`;
      });

      // Create and download file
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `math-tutor-conversation-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export conversation:", error);
    } finally {
      setIsExporting(false);
    }
  }, [messages, problem]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <button
      onClick={exportConversation}
      disabled={isExporting}
      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors font-light px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Export conversation"
      title="Export conversation as text file"
    >
      {isExporting ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Export Conversation</span>
        </>
      )}
    </button>
  );
}

