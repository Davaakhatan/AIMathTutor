"use client";

import { Message, ParsedProblem } from "@/types";
import { useState } from "react";
import { useConceptTracking } from "@/hooks/useConceptTracking";

interface ProblemProgressProps {
  messages: Message[];
  problem: ParsedProblem;
}

/**
 * Shows progress through solving a problem
 * Based on conversation length and hints used
 */
export default function ProblemProgress({ messages, problem }: ProblemProgressProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const userMessages = messages.filter(m => m.role === "user");
  const tutorMessages = messages.filter(m => m.role === "tutor");
  
  // Count actual hints - only messages that were explicitly requested via the hint button
  // ProgressiveHints component adds messages with "💡 Hint:" prefix
  // Or messages that explicitly say they're hints
  const hintsUsed = messages.filter(m => {
    if (m.role !== "tutor") return false;
    const content = m.content;
    // Only count if it's an explicit hint message from the hint system
    // ProgressiveHints adds "💡 Hint:" prefix when user clicks "Get Hint"
    return (
      content.startsWith("💡 Hint:") ||
      (content.startsWith("💡") && content.toLowerCase().includes("hint")) ||
      /^hint\s*:/i.test(content.trim())
    );
  }).length;

  // Check if problem is solved by looking for completion indicators in tutor messages
  // Must be more strict - only mark as solved if tutor explicitly confirms completion
  // NOT just encouragement during the process
  const isSolved = tutorMessages.some(msg => {
    const content = msg.content.toLowerCase();
    
    // Only mark as solved if tutor explicitly confirms completion with definitive phrases
    // These phrases should only appear when the problem is actually solved
    const definitiveCompletionPhrases = [
      "you've solved it",
      "you solved it",
      "you've solved the problem",
      "you solved the problem",
      "solution is correct",
      "answer is correct",
      "that's the correct answer",
      "that is the correct answer",
      "the correct solution",
      "you got it right",
      "you've got it",
      "you got it",
      "you found the answer",
      "you found the solution",
      "congratulations! you solved",
      "congratulations! it looks like you've reached",
      "congratulations! you've reached an answer",
      "congratulations on solving",
      "you've reached an answer",
      "you've reached the answer",
      "you reached an answer",
      "well done! you solved",
      "well done on solving",
      "excellent! you solved",
      "perfect! you solved",
      "you've completed",
      "problem solved",
      "correctly solved",
      "keep up the great work", // Often appears at the end of congratulations
      "keep up the good work",
      "congratulations!",
      // Check if congratulations is followed by completion indicators
    ];
    
    // Check for definitive completion phrases
    const hasDefinitiveCompletion = definitiveCompletionPhrases.some(phrase => 
      content.includes(phrase)
    );
    
    // Special case: "Congratulations!" followed by completion indicators
    // "Congratulations! It looks like you've reached an answer" should be detected
    const congratulationsWithCompletion = (
      content.includes("congratulations") && 
      (content.includes("reached") || 
       content.includes("answer") || 
       content.includes("solution") ||
       content.includes("solved") ||
       content.includes("completed"))
    );
    
    // Check for phrases like "That's right!" or "Great work!" followed by confirmation
    const positiveConfirmation = (
      (content.includes("that's right") || 
       content.includes("that is right") ||
       content.includes("great work") ||
       content.includes("great job") ||
       content.includes("good work") ||
       content.includes("excellent work")) &&
      (content.includes("correct") || 
       content.includes("solution") ||
       content.includes("answer") ||
       content.includes("solved"))
    );
    
    // Also check if tutor confirms a final numerical answer
    // Look for patterns like "yes, x = 4" or "x = 4 is correct" or "the answer is 4" in tutor's response
    const confirmsFinalAnswer = (
      /(yes|correct|right|exactly),?\s+(x|the answer|the solution|it)\s*=\s*\d+/.test(content) ||
      /(x|the answer|the solution|it)\s*=\s*\d+.*correct/i.test(content) ||
      /(the answer|the solution|it)\s+is\s+(the\s+)?correct/i.test(content) ||
      /(the answer|the solution|it)\s+is\s+\d+/.test(content) ||
      /you're right.*\d+/.test(content) ||
      /correct.*answer.*\d+/.test(content) ||
      /(x|the answer|the solution)\s*=\s*\d+.*is\s+(the\s+)?correct/i.test(content)
    ) && !content.includes("?") && !content.includes("what"); // Exclude questions
    
    return hasDefinitiveCompletion || congratulationsWithCompletion || positiveConfirmation || confirmsFinalAnswer;
  });
  
  // Track concept mastery when problem is solved
  useConceptTracking(problem, messages, isSolved);

  // Calculate progress (rough estimate based on conversation length)
  // More exchanges = more progress, but also more hints = less progress
  const totalExchanges = Math.min(userMessages.length, tutorMessages.length);
  
  // If solved, set to 100%, otherwise calculate based on exchanges
  const progress = isSolved 
    ? 100 
    : Math.min(100, Math.max(0, 
        (totalExchanges * 15) - (hintsUsed * 5)
      ));

  // Determine stage
  const getStage = () => {
    if (isSolved) return "Solved!";
    if (totalExchanges === 0) return "Starting";
    if (totalExchanges < 3) return "Understanding";
    if (totalExchanges < 6) return "Working";
    if (totalExchanges < 10) return "Solving";
    return "Finalizing";
  };

  if (messages.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide transition-colors">
            Progress
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
            {getStage()}
          </span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={showDetails ? "Hide details" : "Show details"}
        >
          <svg 
            className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
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

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3 transition-colors">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isSolved ? "bg-green-600 dark:bg-green-500" : "bg-gray-900 dark:bg-gray-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {showDetails && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2 transition-colors">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1 transition-colors">Exchanges</p>
              <p className="text-gray-900 dark:text-gray-100 font-medium transition-colors">{totalExchanges}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1 transition-colors">Hints Used</p>
              <p className="text-gray-900 dark:text-gray-100 font-medium transition-colors">{hintsUsed}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1 transition-colors">Progress</p>
              <p className="text-gray-900 dark:text-gray-100 font-medium transition-colors">{Math.round(progress)}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 transition-colors">
            {isSolved 
              ? "🎉 Congratulations! You solved this problem!" 
              : "Keep going! You&apos;re making progress through this problem."}
          </p>
        </div>
      )}
    </div>
  );
}

