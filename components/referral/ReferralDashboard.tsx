"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getReferralStats, getUserReferrals, type Referral } from "@/services/referralService";
import { logger } from "@/lib/logger";

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalRewardsEarned: number;
  referralCode: string;
  referralUrl: string;
  totalSignups: number;
}

export default function ReferralDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadReferralData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get stats via API route - this is the critical path, show immediately
      const statsResponse = await fetch(`/api/v2/referral?userId=${user.id}`);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
          setLoading(false); // Show UI immediately after stats load
        } else {
          logger.error("Invalid stats response", { statsData });
          setStats({
            totalReferrals: 0,
            completedReferrals: 0,
            totalRewardsEarned: 0,
            referralCode: "",
            referralUrl: "",
            totalSignups: 0,
          });
          setLoading(false);
        }
      } else {
        const errorData = await statsResponse.json().catch(() => ({}));
        logger.error("Stats API error", { status: statsResponse.status, error: errorData });
        setStats({
          totalReferrals: 0,
          completedReferrals: 0,
          totalRewardsEarned: 0,
          referralCode: "",
          referralUrl: "",
          totalSignups: 0,
        });
        setLoading(false);
      }

      // Load referrals list in background (non-blocking)
      getUserReferrals(user.id)
        .then((referralsList) => {
          setReferrals(referralsList || []);
        })
        .catch((referralsError) => {
          logger.error("Error loading referrals list", { error: referralsError });
          setReferrals([]);
        });
    } catch (error) {
      logger.error("Error loading referral data", { error, userId: user.id });
      setStats({
        totalReferrals: 0,
        completedReferrals: 0,
        totalRewardsEarned: 0,
        referralCode: "",
        referralUrl: "",
        totalSignups: 0,
      });
      setReferrals([]);
      setLoading(false);
    }
  }, [user]);

  const copyReferralLink = async () => {
    if (!stats?.referralUrl) return;

    try {
      await navigator.clipboard.writeText(stats.referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error("Error copying referral link", { error });
    }
  };

  const shareReferralLink = async () => {
    if (!stats?.referralUrl) return;

    if (canShare && navigator.share) {
      try {
        await navigator.share({
          title: "Join me on AI Math Tutor!",
          text: "Get personalized math tutoring with AI. Use my referral link to get started!",
          url: stats.referralUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        logger.debug("Share cancelled or failed", { error });
      }
    } else {
      // Fallback to copy
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Unable to load referral data. Please try again later.
        </p>
        <button
          onClick={() => loadReferralData()}
          className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-h-[700px] overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-2">
          Referral Program
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Invite friends and earn rewards together
        </p>
      </div>
      
      {/* Stats Cards - Compact Design */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Referrals
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {stats.totalReferrals}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
            {stats.completedReferrals} done
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Rewards
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {stats.totalRewardsEarned}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
            XP earned
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Signups
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {stats.totalSignups}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
            Total
          </div>
        </div>
      </div>

      {/* Referral Code & Link - Compact */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Your Code
        </div>
        <div className="font-mono text-base font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 mb-3">
          {stats.referralCode || "Generating..."}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={stats.referralUrl || ""}
            placeholder="Generating link..."
            className="flex-1 font-mono text-xs text-gray-900 dark:text-white bg-white dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700"
          />
          <button
            onClick={copyReferralLink}
            disabled={!stats.referralUrl}
            className="px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          {canShare && (
            <button
              onClick={shareReferralLink}
              disabled={!stats.referralUrl}
              className="px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Share
            </button>
          )}
        </div>
      </div>

      {/* How it works - Compact */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">
          How it works
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>Share your link • Friends get 100 XP • You get 200 XP</div>
        </div>
      </div>

      {/* Recent Referrals - Compact */}
      {referrals.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-900 dark:text-white mb-3">
            Recent Referrals
          </div>
          <div className="space-y-2">
            {referrals.slice(0, 5).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {referral.referral_code}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-500">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded ${
                      referral.status === "rewarded"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                        : referral.status === "completed"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {referral.status}
                  </span>
                  {(referral.referrer_reward_amount ?? 0) > 0 && (
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      +{referral.referrer_reward_amount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

