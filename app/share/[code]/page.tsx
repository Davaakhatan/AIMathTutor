"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getShareByCode, trackShareClick } from "@/services/shareService";

/**
 * Share page - displays share card with a related challenge
 * Route: /share/[code]
 * 
 * This page shows:
 * 1. The achievement/share info
 * 2. A related challenge or problem to try
 * 3. Clear CTAs to start the challenge
 */
export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const [shareData, setShareData] = useState<any>(null);
  const [sharerName, setSharerName] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shareCode = params.code as string;

  // Fetch sharer's name from API
  const fetchSharerName = async (data: any): Promise<string | null> => {
    if (!data.user_id && !data.student_profile_id) {
      return null;
    }

    try {
      // Try to get profile name from student_profile_id first
      if (data.student_profile_id) {
        const response = await fetch(`/api/get-profile-name?profileId=${data.student_profile_id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.name) {
            return result.name;
          }
        }
      }

      // Fallback: try to get user name from user_id
      if (data.user_id) {
        const response = await fetch(`/api/get-user-name?userId=${data.user_id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.name) {
            return result.name;
          }
        }
      }
    } catch (e) {
      console.error("[SharePage] Error fetching sharer name:", e);
    }

    return null;
  };

  // Get a default challenge based on share type
  const getDefaultChallenge = (data: any): string => {
    if (data.share_type === "achievement") {
      // Use template challenges based on achievement type
      const templates: Record<string, string> = {
        first_problem: "Solve: If x + 5 = 12, what is the value of x?",
        independent: "Solve: A rectangle has a length of 8 cm and a width of 5 cm. What is its area?",
        hint_master: "Solve: Sarah has 3 times as many apples as Tom. If Tom has 4 apples, how many apples does Sarah have?",
        speed_demon: "Solve: What is 15% of 80?",
        perfectionist: "Solve: Find the value of x if 2x + 3 = 4x - 5",
        streak_7: "Solve: A triangle has sides of length 3, 4, and 5. Is it a right triangle?",
        streak_30: "Solve: If f(x) = x² + 3x - 2, what is f(4)?",
        level_5: "Solve: A store sells shirts for $15 each. If you buy 4 shirts, how much do you pay?",
        level_10: "Solve: Solve the system: 2x + y = 7 and x - y = 2",
      };
      return templates[data.metadata?.achievement_type] || "Solve: If 3x = 15, what is x?";
    } else if (data.share_type === "streak") {
      return "Solve: What is 25% of 120?";
    } else if (data.share_type === "progress") {
      return "Solve: A square has a side length of 6 cm. What is its perimeter?";
    } else if (data.share_type === "problem") {
      return data.metadata?.problem_text || "Solve: If 2x + 5 = 13, what is x?";
    }
    return "Solve: If 3x = 15, what is x?";
  };

  // Generate a related challenge based on share data
  const generateRelatedChallenge = async (data: any): Promise<string> => {
      // For achievement shares, try to generate a related problem
      if (data.share_type === "achievement" && data.metadata?.achievement_type) {
        const achievementType = data.metadata.achievement_type;
        
        // Map achievement types to problem types and difficulties
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
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
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
              return result.problem;
            }
          }
        } catch (e) {
          // Timeout or error - fall back to template
          console.error("[SharePage] Error fetching generated problem:", e);
        }
      }

      // Default challenge (template)
      return getDefaultChallenge(data);
    };

  useEffect(() => {
    if (!shareCode) {
      setError("Invalid share code");
      setLoading(false);
      return;
    }

    const loadShare = async () => {
      try {
        // Track click (don't wait for it - non-blocking)
        trackShareClick(shareCode).catch((err) => {
          console.error("[SharePage] Error tracking share click:", err, shareCode);
        });

        // Get share data
        const data = await getShareByCode(shareCode);

        if (!data) {
          setError("Share not found or expired");
          setLoading(false);
          return;
        }

        setShareData(data);
        console.log("[SharePage] Share data loaded:", data);

        // Fetch sharer's name and challenge in parallel
        const [name, challengeText] = await Promise.allSettled([
          fetchSharerName(data).catch(() => null),
          generateRelatedChallenge(data).catch(() => getDefaultChallenge(data)),
        ]);

        const finalName = name.status === "fulfilled" ? name.value : null;
        const finalChallenge = challengeText.status === "fulfilled" ? challengeText.value : getDefaultChallenge(data);

        console.log("[SharePage] Sharer name:", finalName);
        console.log("[SharePage] Challenge:", finalChallenge);

        setSharerName(finalName);
        setChallenge(finalChallenge);

        setLoading(false);
      } catch (err) {
        // Safely extract error info to avoid TypeError
        let errorMsg = "Failed to load share";
        try {
          if (err instanceof Error) {
            errorMsg = err.message || "Failed to load share";
          } else if (err) {
            errorMsg = String(err);
          }
        } catch (e) {
          // Ignore serialization errors
        }
        console.error("[SharePage] Error loading share:", errorMsg, shareCode);
        setError("Failed to load share");
        setLoading(false);
      }
    };

    loadShare();
  }, [shareCode]);

  const handleTryNow = () => {
    // Always redirect to deep link for micro-task
    router.push(`/s/${shareCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        {/* Share Card Header - Shows who accomplished it */}
        <div className="text-center mb-8">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {sharerName ? (
              <span>{sharerName} shared their accomplishment</span>
            ) : (
              <span>Someone shared their accomplishment</span>
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {shareData.share_type === "achievement" && (
              sharerName ? `${sharerName} unlocked an achievement!` : "Achievement Unlocked!"
            )}
            {shareData.share_type === "streak" && (
              sharerName ? `${sharerName} has a ${shareData.metadata?.streak_days || ''} day streak!` : "Study Streak!"
            )}
            {shareData.share_type === "progress" && (
              sharerName ? `${sharerName} made progress!` : "Learning Progress!"
            )}
            {shareData.share_type === "problem" && (
              sharerName ? `${sharerName} solved a problem!` : "Problem Solved!"
            )}
            {shareData.share_type === "challenge" && (
              sharerName ? `${sharerName} completed a challenge!` : "Challenge Completed!"
            )}
          </h1>

          {shareData.metadata?.achievement_title && (
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              {shareData.metadata.achievement_title}
            </p>
          )}
          {shareData.metadata?.streak_days && !sharerName && (
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              {shareData.metadata.streak_days} day streak!
            </p>
          )}
          {shareData.metadata?.level && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              Level {shareData.metadata.level} reached
            </p>
          )}
        </div>

        {/* Challenge Section - For the viewer to try */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Try This Challenge:
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Can you solve this problem too?
          </p>
          {challenge ? (
            <div className="bg-white dark:bg-gray-900 rounded p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {challenge}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 italic">
                Generating your challenge...
              </p>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleTryNow}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Try This Challenge
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Explore More
          </button>
        </div>
      </div>
    </div>
  );
}

