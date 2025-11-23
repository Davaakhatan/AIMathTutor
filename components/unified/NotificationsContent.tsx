"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  type: "achievement" | "milestone" | "reminder" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

/**
 * Notifications Content - Just the notifications list (no panel wrapper)
 */
export default function NotificationsContent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    if (!user) {
      // Guest mode - use localStorage
      try {
        const localData = localStorage.getItem("aitutor-notifications");
        if (localData) {
          setNotifications(JSON.parse(localData));
        }
      } catch (e) {
        console.error("Error loading notifications from localStorage", e);
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v2/notifications?userId=${user.id}&limit=50`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.notifications) {
          setNotifications(result.notifications);
          // Also cache to localStorage
          localStorage.setItem("aitutor-notifications", JSON.stringify(result.notifications));
        }
      }
    } catch (error) {
      console.error("Error loading notifications from API", error);
      // Fallback to localStorage
      try {
        const localData = localStorage.getItem("aitutor-notifications");
        if (localData) {
          setNotifications(JSON.parse(localData));
        }
      } catch (e) {
        console.error("Error loading notifications from localStorage", e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load on mount and when user changes
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Listen for achievement events
  useEffect(() => {
    const handleAchievement = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: customEvent.detail.type || "achievement",
        title: customEvent.detail.title || "Achievement Unlocked!",
        message: customEvent.detail.message || "Great job!",
        timestamp: Date.now(),
        read: false,
      };

      // Update local state immediately
      setNotifications((prev) => [newNotification, ...prev].slice(0, 50));

      // Save to localStorage for immediate persistence
      try {
        const updated = [newNotification, ...notifications].slice(0, 50);
        localStorage.setItem("aitutor-notifications", JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving notification to localStorage", e);
      }

      // Save to database if logged in
      if (user) {
        try {
          await fetch("/api/v2/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              type: newNotification.type,
              title: newNotification.title,
              message: newNotification.message,
            }),
          });
        } catch (error) {
          console.error("Error saving notification to database", error);
        }
      }
    };

    window.addEventListener("achievementUnlocked", handleAchievement);
    return () => window.removeEventListener("achievementUnlocked", handleAchievement);
  }, [user, notifications]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Update localStorage
    try {
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem("aitutor-notifications", JSON.stringify(updated));
    } catch (e) {
      console.error("Error updating localStorage", e);
    }

    // Update database if logged in
    if (user) {
      try {
        await fetch("/api/v2/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            action: "markRead",
            notificationId: id,
          }),
        });
      } catch (error) {
        console.error("Error marking notification as read in database", error);
      }
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Update localStorage
    try {
      const updated = notifications.map((n) => ({ ...n, read: true }));
      localStorage.setItem("aitutor-notifications", JSON.stringify(updated));
    } catch (e) {
      console.error("Error updating localStorage", e);
    }

    // Update database if logged in
    if (user) {
      try {
        await fetch("/api/v2/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            action: "markAllRead",
          }),
        });
      } catch (error) {
        console.error("Error marking all notifications as read in database", error);
      }
    }
  };

  const clearAll = async () => {
    if (confirm("Clear all notifications?")) {
      setNotifications([]);

      // Clear localStorage
      try {
        localStorage.setItem("aitutor-notifications", JSON.stringify([]));
      } catch (e) {
        console.error("Error clearing localStorage", e);
      }

      // Clear database if logged in
      if (user) {
        try {
          await fetch("/api/v2/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              action: "clearAll",
            }),
          });
        } catch (error) {
          console.error("Error clearing notifications in database", error);
        }
      }
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div className="flex flex-col h-full max-h-[700px]">
      {/* Header */}
      <div className="text-center py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
          Notifications
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Stay updated on achievements and milestones
        </p>
      </div>
      
      {/* Header Actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {notifications.filter((n) => !n.read).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.filter((n) => !n.read).length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="Mark all as read"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-2">
        {recentNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs mt-1">Achievements and milestones will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  notification.read
                    ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.type === "achievement" && <span className="text-xl">🏆</span>}
                    {notification.type === "milestone" && <span className="text-xl">🎯</span>}
                    {notification.type === "reminder" && <span className="text-xl">⏰</span>}
                    {notification.type === "info" && <span className="text-xl">ℹ️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(notification.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {recentNotifications.length > 0 && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={clearAll}
            className="w-full px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

