"use client";

import { useState } from "react";
import ImageUpload from "./upload/ImageUpload";
import { ParsedProblem } from "@/types";

interface ProblemInputProps {
  onProblemParsed: (problem: ParsedProblem) => void;
}

export default function ProblemInput({ onProblemParsed }: ProblemInputProps) {
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedProblem, setParsedProblem] = useState<ParsedProblem | null>(
    null
  );

  const handleImageUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setParsedProblem(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];

        const response = await fetch("/api/parse-problem", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "image",
            data: base64,
          }),
        });

        const result = await response.json();

        if (result.success && result.problem) {
          setParsedProblem(result.problem);
          onProblemParsed(result.problem);
        } else {
          setError(result.error || "Failed to parse image");
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image");
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    setIsProcessing(true);
    setError(null);
    setParsedProblem(null);

    try {
      const response = await fetch("/api/parse-problem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "text",
          data: textInput.trim(),
        }),
      });

      const result = await response.json();

      if (result.success && result.problem) {
        setParsedProblem(result.problem);
        onProblemParsed(result.problem);
        setTextInput("");
      } else {
        setError(result.error || "Failed to parse problem");
      }
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process text");
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
        {/* Text Input */}
        <form onSubmit={handleTextSubmit} className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter problem
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g., 2x + 5 = 13"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all text-gray-900 placeholder-gray-400"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !textInput.trim()}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {isProcessing ? "Processing" : "Submit"}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-white text-xs text-gray-400 uppercase tracking-wide font-medium">
              or
            </span>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Upload image
          </label>
          <ImageUpload onUpload={handleImageUpload} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Parsed Problem Display */}
        {parsedProblem && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Problem recognized
            </p>
            <p className="text-gray-900 leading-relaxed">{parsedProblem.text}</p>
            {parsedProblem.type && (
              <span className="inline-block mt-3 text-xs text-gray-400 font-medium uppercase tracking-wide">
                {parsedProblem.type.replace("_", " ")}
              </span>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <span className="font-light">Processing</span>
          </div>
        )}
      </div>
    </div>
  );
}

