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
      // Step 2: First operation (subtract, add, divide, multiply, isolate, simplify)
      else if (
        (content.includes("subtract") ||
         content.includes("add") ||
         content.includes("divide") ||
         content.includes("multiply") ||
         content.includes("undo") ||
         content.includes("isolate") ||
         content.includes("simplify") ||
         content.includes("distribute") ||
         content.includes("factor")) &&
        !seenSteps.has("operation1")
      ) {
        stepType = "operation1";
        // Extract the operation description
        const operationMatch = fullContent.match(/(subtract|add|divide|multiply|isolate|simplify|distribute|factor)\s+([^\.\?]+)/i);
        if (operationMatch) {
          const operation = operationMatch[1].charAt(0).toUpperCase() + operationMatch[1].slice(1);
          const details = operationMatch[2].substring(0, 40).trim();
          stepDescription = details.length > 0 
            ? `Step 2: ${operation} ${details}${details.length >= 40 ? "..." : ""}`
            : `Step 2: ${operation}`;
        } else {
          stepDescription = "Step 2: First Operation";
        }
        seenSteps.add("operation1");
      }
      // Step 3: Next operation
      else if (
        (content.includes("next") && content.includes("step")) ||
        (content.includes("now") && (content.includes("divide") || content.includes("multiply") || content.includes("subtract") || content.includes("add") || content.includes("simplify"))) ||
        (seenSteps.has("operation1") && !seenSteps.has("operation2") && 
         (content.includes("divide") || content.includes("multiply") || content.includes("get") || content.includes("result") || content.includes("then") || content.includes("finally")))
      ) {
        stepType = "operation2";
        const operationMatch = fullContent.match(/(divide|multiply|get|result|equals?|then|finally|simplify)\s+([^\.\?]+)/i);
        if (operationMatch) {
          const operation = operationMatch[1].charAt(0).toUpperCase() + operationMatch[1].slice(1);
          const details = operationMatch[2].substring(0, 40).trim();
          stepDescription = details.length > 0 
            ? `Step 3: ${operation} ${details}${details.length >= 40 ? "..." : ""}`
            : `Step 3: ${operation}`;
        } else {
          stepDescription = "Step 3: Next Operation";
        }
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
        // Check if this is the last message and if it's a completion message
        const isLastMessage = tutorIndex === tutorMessages.length - 1;
        const isCompletionMessage = (() => {
          const content = msg.content.toLowerCase();
          return (
            content.includes("you've solved it") ||
            content.includes("you solved it") ||
            content.includes("you've got it") ||
            content.includes("you got it") ||
            content.includes("solution is correct") ||
            content.includes("answer is correct") ||
            content.includes("well done") ||
            content.includes("congratulations") ||
            content.includes("excellent") ||
            content.includes("perfect") ||
            /(yes|correct|right),?\s+(x|the answer|the solution|it)\s*=\s*\d+/.test(content) ||
            /(the answer|the solution|it)\s+is\s+\d+/.test(content)
          );
        })();
        
        extractedSteps.push({
          id: `step-${tutorIndex}-${stepType}`,
          description: stepDescription,
          math: stepMath,
          status: isLastMessage && isCompletionMessage ? "completed" : (isLastMessage ? "current" : "completed"),
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
          status: totalExchanges >= 2 ? "completed" : "current",
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
      const isSolved = tutorMessages.some(m => {
        const content = m.content.toLowerCase();
        return (
          content.includes("excellent") ||
          content.includes("well done") ||
          content.includes("correctly") ||
          content.includes("you solved") ||
          content.includes("you've solved") ||
          content.includes("congratulations") ||
          content.includes("perfect") ||
          /(yes|correct|right),?\s+(x|the answer|the solution|it)\s*=\s*\d+/.test(content)
        );
      });
      
      if (isSolved && !seenSteps.has("verification")) {
        extractedSteps.push({
          id: "auto-step-4",
          description: "Step 4: Verify Solution",
          status: "completed",
        });
      }
    }
    
    // Check if problem is solved (by looking at last tutor message only)
    // Must be strict - only mark as solved if tutor explicitly confirms FINAL completion
    const lastTutorMessage = tutorMessages[tutorMessages.length - 1];
    const isSolved = lastTutorMessage ? (() => {
      const content = lastTutorMessage.content.toLowerCase();
      
      // EXCLUDE if the message contains questions - if AI is asking questions, problem is NOT solved
      const hasQuestions = (
        content.includes("?") || 
        content.includes("what") ||
        content.includes("can you") ||
        content.includes("do you") ||
        content.includes("how") ||
        content.includes("which") ||
        content.includes("tell me") ||
        content.includes("let's") ||
        /what\s+do\s+you|what\s+is|what\s+are|what\s+would/.test(content)
      );
      
      // If the message asks questions, it's definitely not solved
      if (hasQuestions) {
        return false;
      }
      
      // Only mark as solved with definitive completion phrases
      const definitivePhrases = [
        "you've solved it",
        "you solved it",
        "you've solved the problem",
        "you solved the problem",
        "the problem is solved",
        "solution is correct",
        "answer is correct",
        "that's the correct answer",
        "that is the correct answer",
        "you've found the correct answer",
        "you found the correct answer",
        "congratulations! you solved",
        "congratulations! you've solved",
        "congratulations on solving",
        "well done! you solved",
        "well done! you've solved",
        "well done on solving",
        "excellent! you solved",
        "perfect! you solved",
        "problem solved",
      ];
      
      const hasDefinitiveCompletion = definitivePhrases.some(phrase => 
        content.includes(phrase)
      );
      
      // Check for explicit answer confirmation without questions
      const confirmsFinalAnswer = (
        /(yes|correct|right|exactly|perfect|excellent|great),?\s+(x|the answer|the solution)\s*=\s*\d+/.test(content) ||
        /(x|the answer|the solution)\s*=\s*\d+.*(is\s+)?(correct|right|the\s+answer)/i.test(content) ||
        /(the answer|the solution)\s+is\s+\d+.*(correct|right|exactly)/i.test(content) ||
        /(the answer|the solution)\s+is\s+\d+$/.test(content)
      ) && !hasQuestions;
      
      // Check for confirmation patterns like "you've found that... is correct"
      const confirmsAnswerIsCorrect = (
        (content.includes("you've found") || content.includes("you found")) &&
        (content.includes("which is correct") || 
         content.includes("is correct") ||
         content.includes("correctly")) &&
        !hasQuestions
      );
      
      // Check for "well done" or similar praise combined with answer confirmation
      const praiseWithCompletion = (
        (content.includes("well done") ||
         content.includes("great job") ||
         content.includes("excellent") ||
         content.includes("perfect") ||
         content.includes("good work")) &&
        (content.includes("correct") ||
         content.includes("found") ||
         content.includes("calculated") ||
         content.includes("solved") ||
         content.includes("answer")) &&
        !hasQuestions
      );
      
      // Check for explicit confirmation of correctness
      const explicitCorrectnessConfirmation = (
        (content.includes("which is correct") ||
         content.includes("that's correct") ||
         content.includes("that is correct") ||
         content.includes("is correct") ||
         content.includes("correctly")) &&
        (content.includes("found") ||
         content.includes("calculated") ||
         content.includes("got") ||
         content.includes("answer") ||
         /\d+/.test(content)) && // Has a number (likely the answer)
        !hasQuestions
      );
      
      return (
        hasDefinitiveCompletion || 
        confirmsFinalAnswer ||
        confirmsAnswerIsCorrect ||
        praiseWithCompletion ||
        explicitCorrectnessConfirmation
      );
    })() : false;
    
    // Update status: mark all steps before current as completed
    // If solved, mark all steps as completed
    let foundCurrent = false;
    extractedSteps.forEach((step, idx) => {
      if (step.id === "problem") return; // Skip problem statement
      if (isSolved) {
        // If problem is solved, mark all steps as completed
        step.status = "completed";
      } else if (step.status === "current") {
        foundCurrent = true;
      } else if (!foundCurrent && step.status !== "completed") {
        step.status = "completed";
      }
    });

    setSteps(extractedSteps);
  }, [messages, problem]);

  if (steps.length <= 1) {
    return null; // Don't show if no steps to visualize
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 p-4 mb-4 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 transition-colors">
            Solution Steps
          </h3>
          {steps.length > 1 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
              ({steps.filter(s => s.status === "completed").length}/{steps.length - 1} completed)
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={isExpanded ? "Collapse steps" : "Expand steps"}
        >
          <svg
            className={`w-4 h-4 transition-transform ${
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
      </div>

      {isExpanded && (
        <div className="space-y-2 mt-3">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <div key={step.id} className="relative">
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`absolute left-3 top-8 w-0.5 h-full ${
                      step.status === "completed"
                        ? "bg-green-400 dark:bg-green-600"
                        : step.status === "current"
                        ? "bg-blue-400 dark:bg-blue-600"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    style={{ height: "calc(100% + 0.5rem)" }}
                  />
                )}
                
                <div
                  className={`relative flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                    step.status === "current"
                      ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 shadow-md"
                      : step.status === "completed"
                      ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      : "bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 opacity-60"
                  }`}
                >
                  {/* Step Number with connecting dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        step.status === "current"
                          ? "bg-blue-500 text-white animate-pulse ring-2 ring-blue-300 dark:ring-blue-700"
                          : step.status === "completed"
                          ? "bg-green-500 text-white ring-2 ring-green-300 dark:ring-green-700"
                          : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span>{index}</span>
                      )}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-sm font-medium transition-colors ${
                      step.status === "current"
                        ? "text-blue-900 dark:text-blue-100"
                        : step.status === "completed"
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {step.description}
                    </p>
                    {step.math && (
                      <div className="mt-2 text-sm">
                        <MathRenderer content={step.math} />
                      </div>
                    )}
                    {step.status === "current" && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>Working on this step...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default StepVisualization;

