"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Notification {
  id: string;
  type: "achievement" | "milestone" | "reminder" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

/**
 * Notification Center - Shows important notifications and achievements
 */
interface NotificationCenterProps {
  hideButton?: boolean; // When true, only run background logic, don't render UI
}

export default function NotificationCenter({ hideButton = false }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>(
    "aitutor-notifications",
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);

  // Calculate unread count
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Listen for achievement events
  useEffect(() => {
    const handleAchievement = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: customEvent.detail.type || "achievement",
        title: customEvent.detail.title || "Achievement Unlocked!",
        message: customEvent.detail.message || "Great job!",
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    };

    window.addEventListener("achievementUnlocked", handleAchievement);
    return () => window.removeEventListener("achievementUnlocked", handleAchievement);
  }, [setNotifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    if (confirm("Clear all notifications?")) {
      setNotifications([]);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const recentNotifications = notifications.slice(0, 10);

  // If hideButton is true, only run background logic, don't render UI
  if (hideButton) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full p-3 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all min-h-[48px] touch-device:min-h-[48px] min-w-[48px] relative"
        style={{ 
          position: 'fixed',
          top: '1rem',
          right: '5.5rem',
          zIndex: 50
        }}
        aria-label="Notifications"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed top-16 right-4 z-[60] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 max-w-[calc(100vw-2rem)] max-h-[60vh] flex flex-col transition-colors">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="Mark all as read"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {recentNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm transition-colors">No notifications yet</p>
            <p className="text-xs mt-1 transition-colors">Achievements and milestones will appear here</p>
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
                    {notification.type === "achievement" && (
                      <span className="text-xl">🏆</span>
                    )}
                    {notification.type === "milestone" && (
                      <span className="text-xl">🎯</span>
                    )}
                    {notification.type === "reminder" && (
                      <span className="text-xl">⏰</span>
                    )}
                    {notification.type === "info" && (
                      <span className="text-xl">ℹ️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 transition-colors">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">
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

