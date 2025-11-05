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

    const tutorMessages = messages.filter(m => m.role === "tutor");
    const userMessages = messages.filter(m => m.role === "user");
    
    // Track step types we've seen to avoid duplicates
    const seenSteps = new Set<string>();
    
    // Analyze tutor messages for step indicators and operations
    tutorMessages.forEach((msg, tutorIndex) => {
      const content = msg.content.toLowerCase();
      const fullContent = msg.content;
      
      // Detect step indicators with better pattern matching
      let stepType: string | null = null;
      let stepDescription: string = "";
      let stepMath: string | undefined = undefined;
      
      // Step 1: Initial understanding/setup
      if (
        (content.includes("what are we trying") || 
         content.includes("what information") ||
         content.includes("what do we have") ||
         content.includes("let's identify") ||
         content.includes("start by")) &&
        !seenSteps.has("setup")
      ) {
        stepType = "setup";
        stepDescription = "Step 1: Understanding the Problem";
        seenSteps.add("setup");
      }
      // Step 2: First operation (subtract, add, divide, multiply)
      else if (
        (content.includes("subtract") ||
         content.includes("add") ||
         content.includes("divide") ||
         content.includes("multiply") ||
         content.includes("undo")) &&
        !seenSteps.has("operation1")
      ) {
        stepType = "operation1";
        // Extract the operation description
        const operationMatch = fullContent.match(/(subtract|add|divide|multiply|undo)\s+([^\.]+)/i);
        stepDescription = operationMatch 
          ? `Step 2: ${operationMatch[1].charAt(0).toUpperCase() + operationMatch[1].slice(1)} ${operationMatch[2].substring(0, 30)}...`
          : "Step 2: First Operation";
        seenSteps.add("operation1");
      }
      // Step 3: Next operation
      else if (
        (content.includes("next") && content.includes("step")) ||
        (content.includes("now") && (content.includes("divide") || content.includes("multiply") || content.includes("subtract") || content.includes("add"))) ||
        (seenSteps.has("operation1") && !seenSteps.has("operation2") && 
         (content.includes("divide") || content.includes("multiply") || content.includes("get") || content.includes("result")))
      ) {
        stepType = "operation2";
        const operationMatch = fullContent.match(/(divide|multiply|get|result|equals?)\s+([^\.]+)/i);
        stepDescription = operationMatch 
          ? `Step 3: ${operationMatch[1].charAt(0).toUpperCase() + operationMatch[1].slice(1)} ${operationMatch[2].substring(0, 30)}...`
          : "Step 3: Next Operation";
        seenSteps.add("operation2");
      }
      // Step 4: Verification/solution
      else if (
        content.includes("verify") ||
        content.includes("plug") ||
        content.includes("check") ||
        content.includes("substitute") ||
        (content.includes("excellent") && content.includes("x =")) ||
        (content.includes("well done") && content.includes("="))
      ) {
        stepType = "verification";
        stepDescription = "Step 4: Verify Solution";
        // Extract the answer if present
        const answerMatch = fullContent.match(/(x\s*=\s*[-]?\d+|answer\s*(is|:)?\s*[-]?\d+)/i);
        if (answerMatch) {
          stepMath = answerMatch[0];
        }
        seenSteps.add("verification");
      }
      
      // If we found a step, add it
      if (stepType) {
        extractedSteps.push({
          id: `step-${tutorIndex}-${stepType}`,
          description: stepDescription,
          math: stepMath,
          status: tutorIndex === tutorMessages.length - 1 ? "current" : "completed",
        });
      }
    });

    // Enhanced fallback: Create steps based on conversation progression
    // Only if we don't have enough steps
    if (extractedSteps.length <= 2 && tutorMessages.length > 0) {
      // Create steps based on conversation flow
      const totalExchanges = Math.min(userMessages.length, tutorMessages.length);
      
      // Step 1: Understanding (already have problem statement)
      if (totalExchanges >= 1 && !seenSteps.has("setup")) {
        extractedSteps.push({
          id: "auto-step-1",
          description: "Step 1: Understanding the Problem",
          status: "completed",
        });
      }
      
      // Step 2: Working on solution
      if (totalExchanges >= 2 && !seenSteps.has("operation1")) {
        extractedSteps.push({
          id: "auto-step-2",
          description: "Step 2: Working on Solution",
          status: totalExchanges >= 3 ? "completed" : "current",
        });
      }
      
      // Step 3: Solving
      if (totalExchanges >= 3 && !seenSteps.has("operation2")) {
        extractedSteps.push({
          id: "auto-step-3",
          description: "Step 3: Solving",
          status: totalExchanges >= 4 ? "completed" : "current",
        });
      }
      
      // Step 4: Verification (if solved)
      const isSolved = tutorMessages.some(m => 
        m.content.toLowerCase().includes("excellent") ||
        m.content.toLowerCase().includes("well done") ||
        m.content.toLowerCase().includes("correctly") ||
        m.content.toLowerCase().includes("you solved")
      );
      
      if (isSolved && !seenSteps.has("verification")) {
        extractedSteps.push({
          id: "auto-step-4",
          description: "Step 4: Verify Solution",
          status: "completed",
        });
      }
    }

    setSteps(extractedSteps);
  }, [messages, problem]);

  if (steps.length <= 1) {
    return null; // Don't show if no steps to visualize
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 p-4 mb-4 transition-colors">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2 text-left"
        aria-label={isExpanded ? "Collapse steps" : "Expand steps"}
      >
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
          Solution Steps
        </h3>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform transition-colors ${
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
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  : step.status === "completed"
                  ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  : "bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 opacity-60"
              }`}
            >
              {/* Step Number */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.status === "current"
                    ? "bg-blue-500 text-white animate-pulse"
                    : step.status === "completed"
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                }`}
              >
                {step.status === "completed" ? "✓" : index + 1}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
                  {step.description}
                </p>
                {step.math && (
                  <div className="mt-2 text-sm">
                    <MathRenderer content={step.math} />
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

