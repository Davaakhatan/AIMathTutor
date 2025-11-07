"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getShareByCode, trackShareClick } from "@/services/shareService";
import { logger } from "@/lib/logger";

/**
 * Deep link page - handles share code redirects
 * Route: /s/[code]
 * 
 * Flow:
 * 1. User clicks share link → lands here
 * 2. Track click
 * 3. If authenticated: redirect to appropriate page with context
 * 4. If not authenticated: redirect to landing page with share code in query
 */
export default function DeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shareCode = params.code as string;

  useEffect(() => {
    if (!shareCode) {
      setError("Invalid share code");
      setLoading(false);
      return;
    }

    const handleDeepLink = async () => {
      try {
        // Track click
        await trackShareClick(shareCode);

        // Get share data
        const shareData = await getShareByCode(shareCode);

        if (!shareData) {
          setError("Share not found or expired");
          setLoading(false);
          return;
        }

        // If user is authenticated, redirect based on share type
        if (user) {
          switch (shareData.share_type) {
            case "problem":
              // Redirect to problem input with pre-filled problem
              router.push(`/?share=${shareCode}&problem=${encodeURIComponent(shareData.metadata.problem_text || "")}`);
              break;
            case "challenge":
              // Redirect to challenge page
              router.push(`/challenge/${shareData.metadata.challenge_id || shareCode}`);
              break;
            case "achievement":
            case "progress":
            case "streak":
            default:
              // Redirect to landing page with share context
              router.push(`/?share=${shareCode}`);
              break;
          }
        } else {
          // Not authenticated - redirect to landing page with share code
          // The landing page will show a "Try Now" challenge
          router.push(`/?share=${shareCode}&try=true`);
        }
      } catch (err) {
        logger.error("Error handling deep link", { error: err, shareCode });
        setError("Failed to process share link");
        setLoading(false);
      }
    };

    handleDeepLink();
  }, [shareCode, user, router]);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div className="text-center">
          <p className="text-gray-900 dark:text-gray-100 text-lg mb-4">{error}</p>
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

  return null; // Will redirect before rendering
}

