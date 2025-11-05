"use client";

import { useState, useEffect, useRef } from "react";

interface Tip {
  title: string;
  content: string;
}

const tips: Tip[] = [
  {
    title: "Ask Questions",
    content: "The tutor guides you through questions. Try answering them step by step.",
  },
  {
    title: "Use Voice Input",
    content: "Click the microphone button to speak your responses instead of typing.",
  },
  {
    title: "Try the Whiteboard",
    content: "Draw diagrams or equations on the whiteboard to visualize problems.",
  },
  {
    title: "Adjust Difficulty",
    content: "Change the difficulty level to match your grade level for better guidance.",
  },
  {
    title: "Export Your Work",
    content: "Save your conversation by clicking the Export button at the bottom.",
  },
];

const shortcuts = [
  { key: "Enter", description: "Send message (in input field)" },
  { key: "Shift + Enter", description: "New line (in input field)" },
  { key: "Ctrl/Cmd + K", description: "Search problems" },
  { key: "?", description: "Show/hide tips and shortcuts" },
  { key: "Esc", description: "Close modals/dialogs" },
];

export default function HelpfulTips() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keyboard shortcut: Press ? to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setIsOpen(!isOpen);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-40 bg-gray-900 dark:bg-gray-700 text-white rounded-full p-3 shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 active:scale-95 touch-device:min-h-[48px] touch-device:min-w-[48px]"
        style={{ bottom: "1rem" }}
        aria-label="Show helpful tips"
        title="Helpful Tips (Press ?)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col transition-colors"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Tips & Shortcuts</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
          aria-label="Close tips"
          type="button"
          title="Close (X)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowShortcuts(false)}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            !showShortcuts
              ? "text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Tips
        </button>
        <button
          onClick={() => setShowShortcuts(true)}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            showShortcuts
              ? "text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Shortcuts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!showShortcuts ? (
          <>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                {tips[currentTip].title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                {tips[currentTip].content}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {tips.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTip(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentTip ? "bg-gray-900 dark:bg-gray-100" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    aria-label={`Go to tip ${index + 1}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentTip((prev) => (prev > 0 ? prev - 1 : tips.length - 1))}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-2 py-1"
                  aria-label="Previous tip"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentTip((prev) => (prev < tips.length - 1 ? prev + 1 : 0))}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-2 py-1"
                  aria-label="Next tip"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Use these keyboard shortcuts to navigate faster:
            </p>
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-300">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono border border-gray-200 dark:border-gray-700">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">?</kbd> to close
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

