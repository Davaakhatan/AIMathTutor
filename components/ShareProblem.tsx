"use client";

import { useState } from "react";
import { ParsedProblem, Message } from "@/types";
import { useToast } from "@/hooks/useToast";

interface ShareProblemProps {
  problem: ParsedProblem | null;
  messages: Message[];
}

/**
 * Share problem and conversation via URL or copy
 */
export default function ShareProblem({ problem, messages }: ShareProblemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const { showToast } = useToast();

  const generateShareLink = () => {
    if (!problem) return;

    // Create a shareable link with problem data
    const shareData = {
      problem: problem.text,
      type: problem.type,
      timestamp: Date.now(),
    };

    // Encode as base64 for URL
    const encoded = btoa(JSON.stringify(shareData));
    const url = `${window.location.origin}?share=${encoded}`;
    setShareUrl(url);
    return url;
  };

  const handleCopyLink = async () => {
    if (!shareUrl) {
      const url = generateShareLink();
      if (!url) return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl || generateShareLink() || "");
      showToast("Link copied to clipboard!", "success");
    } catch (error) {
      showToast("Failed to copy link", "error");
    }
  };

  const handleCopyProblem = async () => {
    if (!problem) return;

    const text = `Math Problem:\n${problem.text}\n\nType: ${problem.type || "Unknown"}\n\nShared from AI Math Tutor`;
    
    try {
      await navigator.clipboard.writeText(text);
      showToast("Problem copied to clipboard!", "success");
    } catch (error) {
      showToast("Failed to copy problem", "error");
    }
  };

  if (!problem) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          generateShareLink();
        }}
        className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-light px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        aria-label="Share problem"
        title="Share problem"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Share Problem</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
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

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-xs font-medium"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyProblem}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium"
            >
              Copy Problem Text
            </button>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Share this problem with others or save it for later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

