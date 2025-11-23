"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

interface AnalyticsData {
  dailyActivity: { date: string; problems: number; xp: number }[];
  problemsByDifficulty: { difficulty: string; count: number }[];
  problemsByType: { type: string; count: number }[];
  weeklyTrend: { week: string; problems: number; avgTime: number }[];
  recentActivity: { date: string; action: string; details: string }[];
}

interface StudentAnalyticsProps {
  studentName: string;
  profileId: string | null;
  onClose?: () => void;
}

export default function StudentAnalytics({ studentName, profileId, onClose }: StudentAnalyticsProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "breakdown">("overview");

  useEffect(() => {
    if (!user || !profileId) {
      setIsLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/v2/student-analytics?userId=${user.id}&profileId=${profileId}`);
        const data = await response.json();

        if (data.success) {
          setAnalytics(data.analytics);
        }
      } catch (error) {
        logger.error("Error fetching student analytics", { error });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, profileId]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-3 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-center text-gray-500 dark:text-gray-400">No analytics data available</p>
      </div>
    );
  }

  const maxProblems = Math.max(...analytics.dailyActivity.map(d => d.problems), 1);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {studentName}&apos;s Analytics
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(["overview", "activity", "breakdown"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Daily Activity Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Daily Activity (Last 14 Days)
              </h4>
              <div className="flex items-end gap-1 h-32">
                {analytics.dailyActivity.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-indigo-500 dark:bg-indigo-600 rounded-t transition-all"
                      style={{ height: `${(day.problems / maxProblems) * 100}%`, minHeight: day.problems > 0 ? '4px' : '0' }}
                      title={`${day.date}: ${day.problems} problems, ${day.xp} XP`}
                    />
                    <span className="text-[9px] text-gray-400 mt-1 rotate-45 origin-left">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Trend */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Weekly Progress
              </h4>
              <div className="space-y-2">
                {analytics.weeklyTrend.map((week, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20">{week.week}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((week.problems / 20) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-right">
                      {week.problems} solved
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recent Activity
            </h4>
            {analytics.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
            ) : (
              analytics.recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{activity.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activity.details}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {new Date(activity.date).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "breakdown" && (
          <div className="space-y-6">
            {/* By Difficulty */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Problems by Difficulty
              </h4>
              <div className="space-y-2">
                {analytics.problemsByDifficulty.map((item, i) => {
                  const total = analytics.problemsByDifficulty.reduce((sum, d) => sum + d.count, 0);
                  const percentage = total > 0 ? (item.count / total) * 100 : 0;
                  const colors: Record<string, string> = {
                    elementary: "bg-green-500",
                    middle: "bg-blue-500",
                    high: "bg-orange-500",
                    advanced: "bg-red-500",
                  };
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-20 capitalize">{item.difficulty}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                        <div
                          className={`${colors[item.difficulty] || "bg-gray-500"} h-3 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Problems by Type
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {analytics.problemsByType.map((item, i) => (
                  <div key={i} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {item.type.replace(/_/g, " ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
