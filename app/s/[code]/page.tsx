"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getShareByCode, trackShareClick, trackShareConversion } from "@/services/shareService";

/**
 * Deep link page - "Try Now" micro-task (5-question challenge)
 * Route: /s/[code]
 * 
 * This page shows:
 * 1. A quick 5-question challenge (micro-task)
 * 2. Works for unauthenticated users
 * 3. Tracks completion and conversion
 * 4. After completion, prompts for signup
 */
export default function DeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [shareData, setShareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const shareCode = params.code as string;

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

        // Generate 5 quick questions for micro-task
        const microTaskQuestions = await generateMicroTaskQuestions(shareDataResult);
        setQuestions(microTaskQuestions);
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

  // Generate 5 quick questions for the micro-task
  const generateMicroTaskQuestions = async (shareData: any): Promise<any[]> => {
    // Use template questions for now (can be enhanced with API later)
    const templates = [
      { question: "If x + 5 = 12, what is x?", answer: "7", type: "algebra" },
      { question: "What is 15% of 80?", answer: "12", type: "arithmetic" },
      { question: "A rectangle has length 8 cm and width 5 cm. What is its area?", answer: "40", type: "geometry" },
      { question: "If 2x = 18, what is x?", answer: "9", type: "algebra" },
      { question: "What is 25% of 120?", answer: "30", type: "arithmetic" },
    ];

    // If it's a problem share, use that problem as first question
    if (shareData.share_type === "problem" && shareData.metadata?.problem_text) {
      return [
        { question: shareData.metadata.problem_text, answer: "", type: "custom" },
        ...templates.slice(0, 4),
      ];
    }

    return templates;
  };

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);

    // Move to next question
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions answered - show results
      calculateScore(newAnswers);
      setShowResult(true);
      setCompleted(true);
      
      // Track conversion (completion of micro-task)
      // Note: Full conversion (signup) will be tracked separately
      trackShareConversion(shareCode, "").catch((err) => {
        console.error("[DeepLinkPage] Error tracking conversion:", err);
      });
    }
  };

  const calculateScore = (userAnswers: string[]) => {
    let correct = 0;
    questions.forEach((q, index) => {
      const userAnswer = userAnswers[index]?.trim().toLowerCase();
      const correctAnswer = q.answer?.trim().toLowerCase();
      if (userAnswer === correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
  };

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
