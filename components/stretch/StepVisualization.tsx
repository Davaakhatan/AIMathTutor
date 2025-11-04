"use client";

import { useState, useEffect, memo } from "react";
import { Message } from "@/types";
import MathRenderer from "../math/MathRenderer";

interface StepVisualizationProps {
  messages: Message[];
  problem: string;
}

interface Step {
  id: string;
  description: string;
  math?: string;
  status: "pending" | "current" | "completed";
}

const StepVisualization = memo(function StepVisualization({
  messages,
  problem,
}: StepVisualizationProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  // Extract steps from conversation history
  useEffect(() => {
    const extractedSteps: Step[] = [];
    
    // Initialize with problem
    extractedSteps.push({
      id: "problem",
      description: "Problem Statement",
      math: problem,
      status: "completed",
    });

    // Analyze tutor messages for step indicators
    messages.forEach((msg, index) => {
      if (msg.role === "tutor") {
        const content = msg.content.toLowerCase();
        
        // Detect step indicators
        if (
          content.includes("first") ||
          content.includes("step 1") ||
          content.includes("start by") ||
          content.includes("begin by")
        ) {
          extractedSteps.push({
            id: `step-${index}-1`,
            description: "Step 1: Initial Setup",
            status: index === messages.length - 1 ? "current" : "completed",
          });
        }
        
        if (
          content.includes("next") ||
          content.includes("step 2") ||
          content.includes("then") ||
          content.includes("after")
        ) {
          extractedSteps.push({
            id: `step-${index}-2`,
            description: "Step 2: Next Operation",
            status: index === messages.length - 1 ? "current" : "completed",
          });
        }
        
        if (
          content.includes("finally") ||
          content.includes("last") ||
          content.includes("step 3") ||
          content.includes("complete")
        ) {
          extractedSteps.push({
            id: `step-${index}-3`,
            description: "Step 3: Final Step",
            status: index === messages.length - 1 ? "current" : "completed",
          });
        }
      }
    });

    // If we have tutor messages but no explicit steps, create generic progress
    if (messages.filter((m) => m.role === "tutor").length > 0 && extractedSteps.length === 1) {
      const tutorCount = messages.filter((m) => m.role === "tutor").length;
      for (let i = 1; i <= Math.min(tutorCount, 4); i++) {
        extractedSteps.push({
          id: `auto-step-${i}`,
          description: `Progress Checkpoint ${i}`,
          status: i === tutorCount ? "current" : "completed",
        });
      }
    }

    setSteps(extractedSteps);
  }, [messages, problem]);

  if (steps.length <= 1) {
    return null; // Don't show if no steps to visualize
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2 text-left"
        aria-label={isExpanded ? "Collapse steps" : "Expand steps"}
      >
        <h3 className="text-sm font-medium text-gray-900">
          Solution Steps
        </h3>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-3 mt-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                step.status === "current"
                  ? "bg-blue-50 border border-blue-200"
                  : step.status === "completed"
                  ? "bg-white border border-gray-200"
                  : "bg-gray-100 border border-gray-200 opacity-60"
              }`}
            >
              {/* Step Number */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.status === "current"
                    ? "bg-blue-500 text-white animate-pulse"
                    : step.status === "completed"
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {step.status === "completed" ? "✓" : index + 1}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {step.description}
                </p>
                {step.math && (
                  <div className="mt-2 text-sm">
                    <MathRenderer text={step.math} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default StepVisualization;

