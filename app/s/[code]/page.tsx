"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getShareByCode, trackShareClick } from "@/services/shareService";
import ChatUI from "@/components/chat/ChatUI";
import ProblemProgress from "@/components/ProblemProgress";
import { ParsedProblem, Message, ProblemType } from "@/types";
import { normalizeProblemText } from "@/lib/textUtils";
import { logger } from "@/lib/logger";
import { AuthProvider } from "@/contexts/AuthContext";

/**
 * Deep link page - "Try This Challenge" - Solve the challenge problem
 * Route: /s/[code]
 * 
 * This page shows:
 * 1. The challenge problem from the share card
 * 2. Full chat interface with AI tutor (Socratic method)
 * 3. Works for unauthenticated users (AuthProvider wraps the page but user will be null)
 * 4. Tracks completion and conversion when problem is solved
 * 5. After completion, prompts for signup
 * 
 * NOTE: AuthProvider is required because ChatUI uses useAuth(), but it works fine
 * for unauthenticated users (user will be null).
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
  
  // Helper function to get challenge from URL params (synchronous)
  const getChallengeFromUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    const urlParams = new URLSearchParams(window.location.search);
    const challengeParam = urlParams.get("challenge");
    if (challengeParam) {
      const decoded = decodeURIComponent(challengeParam);
      logger.info("Challenge found in URL params", { challenge: decoded });
      return decoded;
    }
    return null;
  };

  // Get challenge problem from share data
  const getChallengeProblem = async (data: any): Promise<string> => {
    // Try to get challenge from share metadata first
    if (data.metadata?.challenge_text) {
      return data.metadata.challenge_text;
    }

    // Generate challenge based on share type (same logic as share page)
    if (data.share_type === "achievement" && data.metadata?.achievement_type) {
      const achievementType = data.metadata.achievement_type;
      const problemConfigs: Record<string, { type: ProblemType; difficulty: string }> = {
        first_problem: { type: ProblemType.ALGEBRA, difficulty: "elementary" },
        independent: { type: ProblemType.ALGEBRA, difficulty: "middle" },
        hint_master: { type: ProblemType.WORD_PROBLEM, difficulty: "middle" },
        speed_demon: { type: ProblemType.ARITHMETIC, difficulty: "middle" },
        perfectionist: { type: ProblemType.MULTI_STEP, difficulty: "middle" },
        streak_7: { type: ProblemType.ALGEBRA, difficulty: "middle" },
        streak_30: { type: ProblemType.MULTI_STEP, difficulty: "high" },
        level_5: { type: ProblemType.WORD_PROBLEM, difficulty: "middle" },
        level_10: { type: ProblemType.MULTI_STEP, difficulty: "high" },
      };

      const config = problemConfigs[achievementType] || { type: ProblemType.ALGEBRA, difficulty: "middle" };
      
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
            if (typeof result.problem === 'object' && result.problem && 'text' in result.problem) {
              return (result.problem as { text: string }).text;
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
        // Priority: 1. URL query param (from share page), 2. Share metadata, 3. Generate new
        // Read URL params directly here to avoid race condition
        const challengeFromUrl = getChallengeFromUrl();
        let challengeText: string;
        
        if (challengeFromUrl) {
          // Use challenge from URL (passed from share page) - ensures both pages use the same problem
          challengeText = challengeFromUrl;
          logger.info("Using challenge from URL params", { challengeText });
        } else if (shareDataResult.metadata?.challenge_text) {
          // Use challenge stored in share metadata
          challengeText = shareDataResult.metadata.challenge_text;
          logger.info("Using challenge from share metadata", { challengeText });
        } else {
          // Generate new challenge (fallback)
          challengeText = await getChallengeProblem(shareDataResult);
          logger.info("Generated new challenge problem", { 
            challengeText,
            shareType: shareDataResult.share_type,
            achievementType: shareDataResult.metadata?.achievement_type 
          });
        }
        
        // Parse the problem (create ParsedProblem object)
        const normalizedText = normalizeProblemText(challengeText);
        const problem: ParsedProblem = {
          text: normalizedText,
          type: ProblemType.ALGEBRA, // Default, can be enhanced
          confidence: 0.9, // Default confidence
        };

        logger.info("Parsed challenge problem", { 
          originalText: challengeText,
          normalizedText: problem.text,
          problemType: problem.type
        });

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

        // Log the problem being sent to the API
        logger.info("Initializing chat with challenge problem", {
          problemText: challengeProblem.text,
          problemType: challengeProblem.type,
          difficultyMode,
        });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeProblem, difficultyMode]);

  // Check if problem is solved and track conversion + save challenge
  useEffect(() => {
    if (!sessionId || !allMessages.length || completed || !challengeProblem) return;

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
      
      // Save challenge to database (if user is logged in)
      // This will be handled by the API route that checks auth
      fetch("/api/challenges/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_text: challengeProblem.text,
          challenge_type: "share",
          problem_type: challengeProblem.type,
          share_code: shareCode,
          is_completed: true,
          solved_at: new Date().toISOString(),
          attempts: allMessages.filter(m => m.role === "user").length,
          hints_used: allMessages.filter(m => 
            m.role === "tutor" && m.content.includes("💡 Hint:")
          ).length,
        }),
      }).catch((err) => {
        console.error("[DeepLinkPage] Error saving challenge:", err);
      });
    }
  }, [allMessages, sessionId, completed, shareCode, challengeProblem]);

  const handleSignUp = () => {
    router.push(`/?signup=true&share=${shareCode}`);
  };

  const handleContinue = () => {
    router.push(`/?share=${shareCode}`);
  };

  if (loading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {loading ? "Loading your challenge..." : "Starting conversation..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !shareData || !challengeProblem) {
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

  // Show completion screen after problem is solved
  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Great job! You solved it! 🎉
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
            You&apos;ve completed the challenge! Want to solve more problems?
          </p>
          
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Unlock unlimited problems!
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

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleContinue}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Explore More
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show chat interface with challenge problem
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Try This Challenge
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Solve this problem with the help of your AI tutor
            </p>
          </div>

          {/* Challenge Problem Display */}
          {challengeProblem && (
            <div className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Problem:
              </h2>
              <p className="text-gray-800 dark:text-gray-200">
                {challengeProblem.text}
              </p>
            </div>
          )}

          {/* Chat Interface */}
          {sessionId && challengeProblem ? (
            <div className="space-y-4">
              <ChatUI
                sessionId={sessionId}
                initialMessages={initialMessages}
                problem={challengeProblem}
                enableStretchFeatures={false}
                difficultyMode={difficultyMode}
                voiceEnabled={false}
                onMessagesChange={setAllMessages}
                onRestart={() => {
                  // Restart the challenge
                  setSessionId(null);
                  setInitialMessages([]);
                  setAllMessages([]);
                  setIsInitializing(false);
                }}
              />

              {/* Problem Progress */}
              {allMessages.length > 0 && (
                <ProblemProgress
                  messages={allMessages}
                  problem={challengeProblem}
                  difficultyMode={difficultyMode}
                  userId={user?.id}
                  profileId={activeProfile?.id || null}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Preparing your challenge...</p>
            </div>
          )}
        </div>
      </div>
    </AuthProvider>
  );
}
