"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import eventBus from "@/lib/eventBus";

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  userId: string;
  username?: string;
}

/**
 * Activity Feed - Presence UI showing recent platform activity
 * Makes the platform feel "alive" with social proof
 */
export default function ActivityFeedContent() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Listen for ecosystem events and add to feed
  useEffect(() => {
    // Listen to multiple event types
    const unsubscribers: (() => void)[] = [];

    // Problem completion events
    const unsub1 = eventBus.on("problem_completed", (event) => {
      addActivity({
        id: `${event.userId}-${Date.now()}`,
        type: "problem",
        message: `solved a ${event.data.problemType} problem`,
        timestamp: event.timestamp,
        userId: event.userId,
      });
    });

    // Achievement events
    const unsub2 = eventBus.on("achievement_unlocked", (event) => {
      addActivity({
        id: `${event.userId}-${Date.now()}`,
        type: "achievement",
        message: `unlocked "${event.data.achievementName}" achievement`,
        timestamp: event.timestamp,
        userId: event.userId,
      });
    });

    // Goal events
    const unsub3 = eventBus.on("goal_completed", (event) => {
      addActivity({
        id: `${event.userId}-${Date.now()}`,
        type: "goal",
        message: `completed goal: ${event.data.targetSubject}`,
        timestamp: event.timestamp,
        userId: event.userId,
      });
    });

    // Challenge events
    const unsub4 = eventBus.on("challenge_created", (event) => {
      addActivity({
        id: `${event.userId}-${Date.now()}`,
        type: "challenge",
        message: `created a challenge`,
        timestamp: event.timestamp,
        userId: event.userId,
      });
    });

    unsubscribers.push(unsub1, unsub2, unsub3, unsub4);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const addActivity = (activity: ActivityItem) => {
    setActivities(prev => [activity, ...prev].slice(0, 20)); // Keep last 20
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "problem":
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "achievement":
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
        );
      case "goal":
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        );
      case "challenge":
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
          Activity Feed
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          See what&apos;s happening across the platform
        </p>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No recent activity</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Solve problems to see activity here!
            </p>
          </div>
        ) : (
          activities.map((activity) => {
            const isCurrentUser = activity.userId === user?.id;
            
            return (
              <div
                key={activity.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                  isCurrentUser
                    ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
              >
                {getActivityIcon(activity.type)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-semibold">
                      {isCurrentUser ? "You" : (activity.username || "Someone")}
                    </span>
                    {" "}
                    <span className="text-gray-600 dark:text-gray-400">{activity.message}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {getTimeAgo(activity.timestamp)}
                  </p>
                </div>

                {isCurrentUser && (
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full font-semibold">
                    You
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Real-Time Activity
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This feed shows platform activity in real-time as events occur. Solve problems, unlock achievements, and complete goals to see activity here!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

