"use client";

import { useState } from "react";

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

export default function HelpfulTips() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-40 bg-gray-900 text-white rounded-full p-3 shadow-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        style={{ bottom: "1rem" }}
        aria-label="Show helpful tips"
        title="Helpful Tips"
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
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-xl w-80 max-w-[calc(100vw-2rem)]">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Helpful Tips</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
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
      <div className="p-4">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            {tips[currentTip].title}
          </h4>
          <p className="text-sm text-gray-600 font-light leading-relaxed">
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
                  index === currentTip ? "bg-gray-900" : "bg-gray-300"
                }`}
                aria-label={`Go to tip ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentTip((prev) => (prev > 0 ? prev - 1 : tips.length - 1))}
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors px-2 py-1"
              aria-label="Previous tip"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentTip((prev) => (prev < tips.length - 1 ? prev + 1 : 0))}
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors px-2 py-1"
              aria-label="Next tip"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

