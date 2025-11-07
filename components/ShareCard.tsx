"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createShare, getShareUrl, getDeepLinkUrl, type ShareMetadata } from "@/services/shareService";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/useToast";

interface ShareCardProps {
  shareType: "achievement" | "progress" | "problem" | "streak" | "challenge";
  metadata: ShareMetadata;
  onShareComplete?: (shareUrl: string) => void;
  className?: string;
}

/**
 * ShareCard Component
 * Generates shareable links and provides sharing UI
 */
export default function ShareCard({
  shareType,
  metadata,
  onShareComplete,
  className = "",
}: ShareCardProps) {
  const { user, activeProfile } = useAuth();
  const { showToast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleShare = async () => {
    if (!user) {
      showToast("Please sign in to share", "error");
      return;
    }

    setIsSharing(true);

    try {
      // Create share link
      const shareData = await createShare(
        user.id,
        shareType,
        metadata,
        activeProfile?.id || null
      );

      if (!shareData) {
        showToast("Failed to create share link", "error");
        setIsSharing(false);
        return;
      }

      const url = getShareUrl(shareData.share_code);
      setShareUrl(url);

      // Try native share API first (mobile/desktop)
      if (navigator.share) {
        try {
          const shareText = getShareText(shareType, metadata);
          await navigator.share({
            title: "AI Math Tutor",
            text: shareText,
            url: url,
          });
          showToast("Shared successfully!", "success");
          onShareComplete?.(url);
        } catch (err: any) {
          // User cancelled or error - fall through to copy link
          if (err.name !== "AbortError") {
            logger.error("Error sharing", { error: err });
          }
        }
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard!", "success");
        onShareComplete?.(url);
      }
    } catch (error) {
      logger.error("Error in handleShare", { error });
      showToast("Failed to share", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) {
      await handleShare();
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied to clipboard!", "success");
    } catch (error) {
      logger.error("Error copying link", { error });
      showToast("Failed to copy link", "error");
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing || !user}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors ${className}`}
      aria-label="Share"
    >
      {isSharing ? (
        <>
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Sharing...</span>
        </>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  );
}

/**
 * Generate share text based on share type and metadata
 */
function getShareText(
  shareType: ShareCardProps["shareType"],
  metadata: ShareMetadata
): string {
  switch (shareType) {
    case "achievement":
      return `I just unlocked "${metadata.achievement_title || "an achievement"}" in AI Math Tutor!`;
    case "streak":
      return `I'm on a ${metadata.streak_days || 0} day study streak! Try AI Math Tutor!`;
    case "progress":
      return `I reached Level ${metadata.level || 1} in AI Math Tutor!`;
    case "problem":
      return `I just solved a ${metadata.problem_type || "math"} problem! Try it yourself!`;
    case "challenge":
      return `I challenge you to beat my score! Try AI Math Tutor!`;
    default:
      return "Check out AI Math Tutor - an amazing way to learn math!";
  }
}

/**
 * ShareButton - Simple button component for sharing
 * Use this for quick share buttons throughout the app
 */
export function ShareButton({
  shareType,
  metadata,
  className = "",
  size = "md",
}: {
  shareType: ShareCardProps["shareType"];
  metadata: ShareMetadata;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-1.5 text-base",
    lg: "px-4 py-2 text-lg",
  };

  return (
    <ShareCard
      shareType={shareType}
      metadata={metadata}
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}

