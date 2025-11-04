"use client";

import { useState, useEffect } from "react";

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press ? to toggle shortcuts help
      if (e.key === "?" && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showShortcuts]);

  const shortcuts = [
    { key: "Enter", description: "Send message (in input field)" },
    { key: "Shift + Enter", description: "New line (in input field)" },
    { key: "Ctrl/Cmd + K", description: "Search problems" },
    { key: "?", description: "Show/hide keyboard shortcuts" },
    { key: "Esc", description: "Close modals/dialogs" },
  ];

  if (!showShortcuts) {
    return (
      <button
        onClick={() => setShowShortcuts(true)}
        className="fixed bottom-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 text-xs"
        aria-label="Show keyboard shortcuts"
        title="Press ? for keyboard shortcuts"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Keyboard Shortcuts</h3>
        <button
          onClick={() => setShowShortcuts(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close shortcuts"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700 font-mono">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-200">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">?</kbd> to close
      </p>
    </div>
  );
}

