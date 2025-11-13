"use client";

import { Message, ParsedProblem } from "@/types";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConceptTracking } from "@/hooks/useConceptTracking";
import { useDifficultyTracking } from "@/hooks/useDifficultyTracking";
import { DifficultyLevel } from "@/services/difficultyTracker";
import { detectProblemCompletion } from "@/services/completionDetector";

interface ProblemProgressProps {
  messages: Message[];
  problem: ParsedProblem;
  difficultyMode?: DifficultyLevel;
  userId?: string;
  profileId?: string | null;
}

/**
 * Shows progress through solving a problem
 * Based on conversation length and hints used
 */
export default function ProblemProgress({ messages, problem, difficultyMode = "middle", userId, profileId }: ProblemProgressProps) {
  const router = useRouter();
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

  // Use smart completion detection instead of hardcoded phrases
  // This runs on every render when messages change, so it's always up-to-date
  const completionResult = detectProblemCompletion(messages, problem);
  const isSolved = completionResult.isCompleted;
  
  // Log for debugging (only in development)
  if (process.env.NODE_ENV === "development") {
    // Always log when we have messages and a problem
    if (messages.length > 0 && problem) {
      const lastTutorMsg = tutorMessages[tutorMessages.length - 1]?.content || "";
      const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
      
      if (isSolved) {
        console.log("✅ Problem marked as solved:", {
          score: completionResult.score,
          confidence: completionResult.confidence,
          reasons: completionResult.reasons,
          messageCount: messages.length,
          lastTutorMsg: lastTutorMsg.substring(0, 50),
          lastUserMsg: lastUserMsg.substring(0, 30),
        });
      } else {
        // Log every time to help debug
        console.log("⏳ Problem not solved:", {
          score: completionResult.score,
          confidence: completionResult.confidence,
          reasons: completionResult.reasons,
          lastTutorMsg: lastTutorMsg.substring(0, 50),
          lastUserMsg: lastUserMsg.substring(0, 30),
        });
      }
    }
  }

  // Legacy code kept for reference but not used
  const recentTutorMessages = tutorMessages.slice(-3); // Check last 3 messages
  const _legacyIsSolved = recentTutorMessages.length > 0 ? (() => {
    // Check each recent message, starting from the most recent
    for (const tutorMessage of [...recentTutorMessages].reverse()) {
      const content = tutorMessage.content.toLowerCase();
    
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
    
    // Only mark as solved if tutor explicitly confirms FINAL completion
    // These phrases should ONLY appear when the problem is COMPLETELY solved
    const definitiveCompletionPhrases = [
      "you've solved it",
      "you solved it",
      "you've solved the problem",
      "you solved the problem",
      "the problem is solved",
      "solution is correct",
      "answer is correct",
      "that's the correct answer",
      "that is the correct answer",
      "the correct solution",
      "you've found the correct answer",
      "you found the correct answer",
      "you've found the correct solution",
      "congratulations! you solved",
      "congratulations! you've solved",
      "congratulations on solving",
      "congratulations! you've found the answer",
      "well done! you solved",
      "well done! you've solved",
      "well done on solving",
      "well done on", // Catches "well done on solving the equation"
      "excellent! you solved",
      "perfect! you solved",
      "you've completed the problem",
      "problem solved",
      "correctly solved",
    ];
    
    // Check for definitive completion phrases (only if no questions)
    const hasDefinitiveCompletion = definitiveCompletionPhrases.some(phrase => 
      content.includes(phrase)
    );
    
    // Special case: "Congratulations!" followed by explicit completion indicators
    const congratulationsWithCompletion = (
      content.includes("congratulations") && 
      (content.includes("solved") || 
       content.includes("completed") ||
       content.includes("found the answer") ||
       content.includes("found the solution"))
    );
    
    // Check if tutor confirms a final numerical answer with explicit confirmation
    // Must be clear confirmation, not just mentioning the answer
    const confirmsFinalAnswer = (
      // Patterns like "Yes, x = 8 is correct" or "Exactly! x = 8" or "That's right! x = 8"
      /(yes|correct|right|exactly|perfect|excellent|great),?\s+(x|the answer|the solution)\s*=\s*\d+/.test(content) ||
      /(x|the answer|the solution)\s*=\s*\d+.*(is\s+)?(correct|right|the\s+answer)/i.test(content) ||
      /(the answer|the solution)\s+is\s+\d+.*(correct|right|exactly)/i.test(content) ||
      // Patterns like "That's correct! x = 8" or "Perfect! The answer is 8"
      /(that's|that is)\s+(correct|right|the\s+answer).*\d+/.test(content) ||
      /(the answer|the solution)\s+is\s+\d+$/.test(content) // "The answer is 8" at end of message
    ) && !hasQuestions; // Must not have questions
    
    // Check for phrases that indicate the student has reached the final answer
    // But only if they're explicit about completion
    const reachedFinalAnswer = (
      (content.includes("you've reached") || 
       content.includes("you reached") ||
       content.includes("you've found") ||
       content.includes("you found")) &&
      (content.includes("answer") || content.includes("solution")) &&
      !hasQuestions
    );
    
    // Check for confirmation patterns that indicate completion
    // Patterns like "you've found that X is correct" or "which is correct" with positive feedback
    const confirmsAnswerIsCorrect = (
      // Patterns like "you've found that... is correct" or "which is correct"
      (content.includes("you've found") || content.includes("you found")) &&
      (content.includes("which is correct") || 
       content.includes("is correct") ||
       content.includes("correctly")) &&
      !hasQuestions
    );
    
    // Check for "well done" or similar praise combined with answer confirmation
    const praiseWithCompletion = (
      (content.includes("well done") ||
       content.includes("well done on") ||
       content.includes("great job") ||
       content.includes("great work") ||
       content.includes("excellent") ||
       content.includes("perfect") ||
       content.includes("good work")) &&
      (content.includes("correct") ||
       content.includes("found") ||
       content.includes("you've found") ||
       content.includes("you found") ||
       content.includes("calculated") ||
       content.includes("solved") ||
       content.includes("answer")) &&
      !hasQuestions
    );
    
    // Check for explicit confirmation of correctness (e.g., "which is correct", "that's correct")
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
    
      // Only return true if we have strong evidence of completion AND no questions
      if (
        hasDefinitiveCompletion || 
        congratulationsWithCompletion || 
        confirmsFinalAnswer || 
        reachedFinalAnswer ||
        confirmsAnswerIsCorrect ||
        praiseWithCompletion ||
        explicitCorrectnessConfirmation
      ) {
        return true; // Found confirmation in this message
      }
    }
    return false; // No confirmation found in recent messages
  })() : false;
  
  // Track concept mastery when problem is solved
  useConceptTracking(problem, messages, isSolved);
  // Track difficulty performance when problem is solved
  useDifficultyTracking(problem, messages, isSolved, difficultyMode);

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

  // Force re-render when completion status changes (for debugging)
  const stage = getStage();
  
  // Listen for server-side completion events to force re-check
  // This ensures the UI updates even if there's a timing issue with message updates
  const [forceCheck, setForceCheck] = useState(0);
  useEffect(() => {
    const handleProblemCompleted = () => {
      // Force a re-check by updating state
      setForceCheck(prev => prev + 1);
    };
    
    // Listen for custom event that might be dispatched from the page
    window.addEventListener("problem_completed", handleProblemCompleted);
    return () => window.removeEventListener("problem_completed", handleProblemCompleted);
  }, []);
  
  // Log state changes for debugging - hooks must be called unconditionally
  const prevSolvedRef = useRef(isSolved);
  useEffect(() => {
    // Only log in development mode
    if (process.env.NODE_ENV === "development" && prevSolvedRef.current !== isSolved) {
      console.log("🔄 Progress status changed:", {
        wasSolved: prevSolvedRef.current,
        isSolved,
        score: completionResult.score,
        stage,
        messageCount: messages.length,
        forceCheck,
      });
    }
    
    // Emit event when problem becomes solved (state transition)
    // CRITICAL: Only emit ONCE when transitioning from unsolved → solved
    if (!prevSolvedRef.current && isSolved && problem && userId) {
      // Problem just became solved - emit event to orchestrator
      console.log("🎉 Problem solved! Emitting completion event", { userId, problemType: problem.type });
      
      import("@/lib/eventBus").then(({ default: eventBus }) => {
        eventBus.emit("problem_completed", userId, {
          problemText: problem.text || "",
          problemType: problem.type || "unknown",
          difficulty: (problem as any).difficulty || "unknown",
          hintsUsed: 0, // TODO: Track from state
          timeSpent: 0, // TODO: Track from session start
          profileId: profileId,
        });
      });
    }
    
    prevSolvedRef.current = isSolved;
  }, [isSolved, completionResult.score, stage, messages.length, forceCheck, problem?.text, problem?.type, userId, profileId]);

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
      
      {/* Back to Home button - shows when problem is solved */}
      {isSolved && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 transition-colors">
          <button
            onClick={() => {
              // Clear the saved session before navigating home
              try {
                localStorage.removeItem("aitutor-session");
                localStorage.removeItem("aitutor-problem");
                localStorage.removeItem("aitutor-messages");
              } catch (error) {
                console.error("Error clearing session:", error);
              }
              
              // Navigate to home page using Next.js router (avoids webpack errors)
              router.push("/");
            }}
            className="w-full py-2 px-4 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-lg transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}

