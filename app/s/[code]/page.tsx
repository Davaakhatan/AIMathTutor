"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getShareByCode, trackShareClick } from "@/services/shareService";
import ChatUI from "@/components/chat/ChatUI";
import ProblemProgress from "@/components/ProblemProgress";
import { ParsedProblem, Message } from "@/types";
import { normalizeProblemText } from "@/lib/textUtils";
import { logger } from "@/lib/logger";

/**
 * Deep link page - "Try This Challenge" - Solve the challenge problem
 * Route: /s/[code]
 * 
 * This page shows:
 * 1. The challenge problem from the share card
 * 2. Full chat interface with AI tutor (Socratic method)
 * 3. Works for unauthenticated users (NO AuthProvider required)
 * 4. Tracks completion and conversion when problem is solved
 * 5. After completion, prompts for signup
 * 
 * NOTE: This page does NOT use useAuth() - it works without authentication
 */
export default function DeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const [shareData, setShareData] = useState<any>(null);
  const [challengeProblem, setChallengeProblem] = useState<ParsedProblem | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [difficultyMode, setDifficultyMode] = useState<"elementary" | "middle" | "high" | "advanced">("middle");
  const shareCode = params.code as string;

  // Get challenge problem from share data
  const getChallengeProblem = async (data: any): Promise<string> => {
    // Try to get challenge from share metadata first
    if (data.metadata?.challenge_text) {
      return data.metadata.challenge_text;
    }

    // Generate challenge based on share type (same logic as share page)
    if (data.share_type === "achievement" && data.metadata?.achievement_type) {
      const achievementType = data.metadata.achievement_type;
      const problemConfigs: Record<string, { type: string; difficulty: string }> = {
        first_problem: { type: "algebra", difficulty: "elementary" },
        independent: { type: "algebra", difficulty: "middle" },
        hint_master: { type: "word_problem", difficulty: "middle" },
        speed_demon: { type: "arithmetic", difficulty: "middle" },
        perfectionist: { type: "multi_step", difficulty: "middle" },
        streak_7: { type: "algebra", difficulty: "middle" },
        streak_30: { type: "multi_step", difficulty: "high" },
        level_5: { type: "word_problem", difficulty: "middle" },
        level_10: { type: "multi_step", difficulty: "high" },
      };

      const config = problemConfigs[achievementType] || { type: "algebra", difficulty: "middle" };
      
      // Try API generation with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch("/api/generate-problem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: config.type,
            difficulty: config.difficulty,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (result.problem) {
            // Extract text if it's an object
            if (typeof result.problem === 'string') {
              return result.problem;
            }
            if (typeof result.problem === 'object' && result.problem.text) {
              return result.problem.text;
            }
          }
        }
      } catch (e) {
        // Fall back to template
      }

      // Default templates
      const templates: Record<string, string> = {
        first_problem: "If x + 5 = 12, what is the value of x?",
        independent: "A rectangle has a length of 8 cm and a width of 5 cm. What is its area?",
        hint_master: "Sarah has 3 times as many apples as Tom. If Tom has 4 apples, how many apples does Sarah have?",
        speed_demon: "What is 15% of 80?",
        perfectionist: "Find the value of x if 2x + 3 = 4x - 5",
        streak_7: "A triangle has sides of length 3, 4, and 5. Is it a right triangle?",
        streak_30: "If f(x) = x² + 3x - 2, what is f(4)?",
        level_5: "A store sells shirts for $15 each. If you buy 4 shirts, how much do you pay?",
        level_10: "Solve the system: 2x + y = 7 and x - y = 2",
      };
      return templates[achievementType] || "If 3x = 15, what is x?";
    } else if (data.share_type === "problem" && data.metadata?.problem_text) {
      return data.metadata.problem_text;
    }

    // Default challenge
    return "If 3x = 15, what is x?";
  };

  useEffect(() => {
    if (!shareCode) {
      setError("Invalid share code");
      setLoading(false);
      return;
    }

    const handleDeepLink = async () => {
      try {
        // Track click (don't wait - non-blocking)
        trackShareClick(shareCode).catch((err) => {
          console.error("[DeepLinkPage] Error tracking share click:", err, shareCode);
        });

        // Get share data
        const shareDataResult = await getShareByCode(shareCode);

        if (!shareDataResult) {
          setError("Share not found or expired");
          setLoading(false);
          return;
        }

        setShareData(shareDataResult);

        // Get challenge problem text
        const challengeText = await getChallengeProblem(shareDataResult);
        
        // Parse the problem (create ParsedProblem object)
        const normalizedText = normalizeProblemText(challengeText);
        const problem: ParsedProblem = {
          text: normalizedText,
          type: "algebra", // Default, can be enhanced
          difficulty: "middle",
        };

        setChallengeProblem(problem);
        setLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[DeepLinkPage] Error handling deep link:", errorMsg, shareCode);
        setError("Failed to process share link");
        setLoading(false);
      }
    };

    handleDeepLink();
  }, [shareCode]);

  // Initialize chat session with challenge problem
  useEffect(() => {
    if (!challengeProblem || sessionId || isInitializing) return;

    const initializeChat = async () => {
      setIsInitializing(true);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const requestBody: any = {
          problem: challengeProblem,
          difficultyMode: difficultyMode,
        };

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to initialize: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success || !result.sessionId || !result.response?.text) {
          throw new Error(result.error || "Failed to start conversation");
        }

        setSessionId(result.sessionId);
        logger.info("Challenge session initialized", { sessionId: result.sessionId });

        const initialMessage: Message = {
          id: Date.now().toString(),
          role: "tutor",
          content: result.response.text,
          timestamp: result.response.timestamp,
        };

        setInitialMessages([initialMessage]);
        setAllMessages([initialMessage]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error("Failed to initialize challenge chat", { error: errorMsg });
        setError(`Failed to start challenge: ${errorMsg}`);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, [challengeProblem, difficultyMode]);

  // Check if problem is solved and track conversion
  useEffect(() => {
    if (!sessionId || !allMessages.length || completed) return;

    const tutorMessages = allMessages.filter(m => m.role === "tutor");
    const isSolved = tutorMessages.some(msg => {
      const content = msg.content.toLowerCase();
      const completionPhrases = [
        "you've solved it",
        "you solved it",
        "solution is correct",
        "answer is correct",
        "congratulations",
        "well done",
        "excellent",
        "perfect",
        "correct!",
        "that's right",
        "that is correct",
        "you got it",
        "you got it right",
        "great job",
      ];
      return completionPhrases.some(phrase => content.includes(phrase));
    });

    if (isSolved && !completed) {
      setCompleted(true);
      
      // Track micro-task completion (conversion)
      fetch("/api/share/track-conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareCode, newUserId: null }),
      }).catch((err) => {
        console.error("[DeepLinkPage] Error tracking conversion:", err);
      });
    }
  }, [allMessages, sessionId, completed, shareCode]);

  const handleSignUp = () => {
    router.push(`/?signup=true&share=${shareCode}`);
  };

  const handleContinue = () => {
    if (user) {
      // Authenticated - go to main app
      router.push(`/?share=${shareCode}`);
    } else {
      // Not authenticated - prompt signup
      handleSignUp();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your challenge...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div className="text-center">
          <p className="text-gray-900 dark:text-gray-100 text-lg mb-4">{error || "Share not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Great job! You scored {score} out of {questions.length}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
            {score === questions.length 
              ? "Perfect score! 🎉" 
              : score >= questions.length * 0.6 
              ? "Well done! Keep practicing!" 
              : "Good try! Practice makes perfect!"}
          </p>
          
          {!user && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Want to unlock more challenges?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Sign up for free to access unlimited problems, track your progress, and unlock achievements!
              </p>
              <button
                onClick={handleSignUp}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Sign Up Free
              </button>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleContinue}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {user ? "Continue Learning" : "Explore More"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div className="text-center">
          <p className="text-gray-900 dark:text-gray-100 text-lg mb-4">Preparing your challenge...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {currentQ.question}
          </h2>
          
          {/* Simple answer input */}
          <div className="mt-4">
            <input
              type="text"
              value={answers[currentQuestion] || ""}
              onChange={(e) => setAnswers([...answers.slice(0, currentQuestion), e.target.value, ...answers.slice(currentQuestion + 1)])}
              onKeyPress={(e) => {
                if (e.key === "Enter" && answers[currentQuestion]) {
                  handleAnswer(answers[currentQuestion]);
                }
              }}
              placeholder="Enter your answer..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoFocus
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            onClick={() => handleAnswer(answers[currentQuestion] || "")}
            disabled={!answers[currentQuestion]}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestion < questions.length - 1 ? "Next Question" : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}
