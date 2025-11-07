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
    if (!user) return;

    try {
      setLoading(true);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      // Get stats via API route
      const statsResponse = await Promise.race([
        fetch(`/api/referral/stats?userId=${user.id}`),
        timeoutPromise
      ]) as Response;
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
        } else {
          logger.error("Invalid stats response", { statsData });
          // Create default stats if API returns invalid data
          setStats({
            totalReferrals: 0,
            completedReferrals: 0,
            totalRewardsEarned: 0,
            referralCode: "",
            referralUrl: "",
            totalSignups: 0,
          });
        }
      } else {
        const errorData = await statsResponse.json().catch(() => ({}));
        logger.error("Stats API error", { status: statsResponse.status, error: errorData });
        // Create default stats on error
        setStats({
          totalReferrals: 0,
          completedReferrals: 0,
          totalRewardsEarned: 0,
          referralCode: "",
          referralUrl: "",
          totalSignups: 0,
        });
      }

      // Get referrals list
      try {
        const referralsList = await getUserReferrals(user.id);
        setReferrals(referralsList || []);
      } catch (referralsError) {
        logger.error("Error loading referrals list", { error: referralsError });
        setReferrals([]);
      }
    } catch (error) {
      logger.error("Error loading referral data", { error, userId: user.id });
      // Set default stats on error
      setStats({
        totalReferrals: 0,
        completedReferrals: 0,
        totalRewardsEarned: 0,
        referralCode: "",
        referralUrl: "",
        totalSignups: 0,
      });
      setReferrals([]);
    } finally {
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Referral Program
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Invite friends and earn rewards when they sign up!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Total Referrals
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalReferrals}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {stats.completedReferrals} completed
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Rewards Earned
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalRewardsEarned} XP
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            From referrals
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Signups
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalSignups}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Total signups
          </div>
        </div>
      </div>

      {/* Referral Code & Link */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Referral Code
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Code
            </div>
            <div className="font-mono text-xl font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded border border-gray-200 dark:border-gray-700">
              {stats.referralCode || "Generating..."}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Referral Link
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={stats.referralUrl || ""}
              placeholder={stats.referralCode ? "Generating link..." : "No referral code"}
              className="flex-1 font-mono text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded border border-gray-200 dark:border-gray-700"
            />
            <button
              onClick={copyReferralLink}
              disabled={!stats.referralUrl}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            {canShare && (
              <button
                onClick={shareReferralLink}
                disabled={!stats.referralUrl}
                className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Share
              </button>
            )}
          </div>
        </div>

        {/* Rewards Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            How it works
          </div>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Share your referral link with friends</li>
            <li>• They get 100 XP when they sign up</li>
            <li>• You get 200 XP for each successful referral</li>
            <li>• Rewards are awarded automatically</li>
          </ul>
        </div>
      </div>

      {/* Recent Referrals */}
      {referrals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Referrals
          </h3>
          <div className="space-y-3">
            {referrals.slice(0, 10).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {referral.referral_code}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      referral.status === "rewarded"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                        : referral.status === "completed"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {referral.status}
                  </span>
                  {referral.referrer_reward_amount && (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      +{referral.referrer_reward_amount} XP
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

