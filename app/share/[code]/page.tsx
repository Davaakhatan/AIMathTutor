"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getShareByCode, trackShareClick } from "@/services/shareService";
import { logger } from "@/lib/logger";

/**
 * Share page - displays share card and allows sharing
 * Route: /share/[code]
 * 
 * This page shows the share card visually and provides sharing options
 */
export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const [shareData, setShareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shareCode = params.code as string;

  useEffect(() => {
    if (!shareCode) {
      setError("Invalid share code");
      setLoading(false);
      return;
    }

    const loadShare = async () => {
      try {
        // Track click
        await trackShareClick(shareCode);

        // Get share data
        const data = await getShareByCode(shareCode);

        if (!data) {
          setError("Share not found or expired");
          setLoading(false);
          return;
        }

        setShareData(data);
        setLoading(false);
      } catch (err) {
        logger.error("Error loading share", { error: err, shareCode });
        setError("Failed to load share");
        setLoading(false);
      }
    };

    loadShare();
  }, [shareCode]);

  const handleTryNow = () => {
    // Redirect to deep link
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
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {shareData.share_type === "achievement" && "Achievement Unlocked!"}
          {shareData.share_type === "streak" && "Study Streak!"}
          {shareData.share_type === "progress" && "Learning Progress!"}
          {shareData.share_type === "problem" && "Problem Solved!"}
          {shareData.share_type === "challenge" && "Challenge!"}
        </h1>

        <div className="mb-6">
          {shareData.metadata.achievement_title && (
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              {shareData.metadata.achievement_title}
            </p>
          )}
          {shareData.metadata.streak_days && (
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              {shareData.metadata.streak_days} day streak!
            </p>
          )}
          {shareData.metadata.level && (
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              Level {shareData.metadata.level} reached!
            </p>
          )}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleTryNow}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Try Now
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

