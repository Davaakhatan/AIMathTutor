"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import StudentAnalytics from "@/components/StudentAnalytics";

interface StudentQuickStatsProps {
  studentName: string;
  profileId: string | null;
}

export default function StudentQuickStats({ studentName, profileId }: StudentQuickStatsProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalXP: 0,
    level: 1,
    currentStreak: 0,
    problemsSolved: 0,
    isLoading: true,
  });
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    if (!user || !profileId) {
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch XP, streak, and problems count in parallel
        const [xpRes, streakRes, problemsRes] = await Promise.all([
          fetch(`/api/v2/xp?userId=${user.id}&profileId=${profileId}`),
          fetch(`/api/v2/streak?userId=${user.id}&profileId=${profileId}`),
          fetch(`/api/v2/problems?userId=${user.id}&profileId=${profileId}&action=countSolved`),
        ]);

        const [xpData, streakData, problemsData] = await Promise.all([
          xpRes.json(),
          streakRes.json(),
          problemsRes.json(),
        ]);

        setStats({
          totalXP: xpData.data?.total_xp || 0,
          level: xpData.data?.level || 1,
          currentStreak: streakData.data?.current_streak || 0,
          problemsSolved: problemsData.count || 0,
          isLoading: false,
        });

        logger.debug("StudentQuickStats loaded", {
          profileId,
          totalXP: xpData.data?.total_xp,
          level: xpData.data?.level,
          streak: streakData.data?.current_streak,
          problems: problemsData.count,
        });
      } catch (error) {
        logger.error("Error fetching student stats", { error });
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, [user, profileId]);

  if (stats.isLoading) {
    return (
      <div className="text-center py-12 px-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="w-8 h-8 border-3 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading {studentName}&apos;s stats...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800/80 dark:to-gray-900/80 rounded-xl border border-indigo-100 dark:border-gray-700 p-6 shadow-sm">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mb-3">
          <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {studentName}&apos;s Dashboard
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Monitoring student progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* XP */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl p-4 border border-yellow-100 dark:border-yellow-900/30 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">XP</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalXP.toLocaleString()}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Level {stats.level}</p>
        </div>

        {/* Streak */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl p-4 border border-orange-100 dark:border-orange-900/30 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.currentStreak}</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">day{stats.currentStreak !== 1 ? 's' : ''} in a row</p>
        </div>

        {/* Problems Solved */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl p-4 border border-green-100 dark:border-green-900/30 shadow-sm hover:shadow-md transition-shadow col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Problems Solved</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.problemsSolved}</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">total completed</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-500 dark:text-green-400">
                {stats.problemsSolved > 0 ? '🎯' : '📝'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="text-center space-y-3">
        <button
          onClick={() => setShowAnalytics(true)}
          className="w-full px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View Detailed Analytics
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Switch back to &quot;Personal&quot; to solve problems yourself.
        </p>
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <StudentAnalytics
              studentName={studentName}
              profileId={profileId}
              onClose={() => setShowAnalytics(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
