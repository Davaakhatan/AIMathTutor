"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format
  frequency: "daily" | "weekly";
}

/**
 * Study reminder component - shows notifications and tracks study goals
 */
export default function StudyReminder() {
  const [settings, setSettings] = useLocalStorage<ReminderSettings>("aitutor-reminders", {
    enabled: false,
    time: "18:00",
    frequency: "daily",
  });
  const [showReminder, setShowReminder] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!settings.enabled) return;

    const checkReminder = () => {
      const now = new Date();
      const [hours, minutes] = settings.time.split(":").map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      // Check if it's time for reminder (within 5 minutes)
      const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());
      const fiveMinutes = 5 * 60 * 1000;

      if (timeDiff < fiveMinutes) {
        // Check if user has studied today
        const today = new Date().toDateString();
        const lastStudy = localStorage.getItem("aitutor-last-study");
        
        if (lastStudy !== today) {
          setShowReminder(true);
        }
      }
    };

    const interval = setInterval(checkReminder, 60000); // Check every minute
    checkReminder(); // Check immediately

    return () => clearInterval(interval);
  }, [settings]);

  // Request notification permission
  const requestPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    if (showReminder && "Notification" in window && Notification.permission === "granted") {
      new Notification("Time to Study! 📚", {
        body: "It's time for your daily math practice. Keep your streak going!",
        icon: "/icon.svg",
      });
    }
  }, [showReminder]);

  if (!isOpen && !showReminder) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-40 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        style={{ bottom: "21rem" }}
        aria-label="Study reminders"
        title="Study Reminders"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </button>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="fixed right-4 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 max-w-[calc(100vw-2rem)] transition-colors"
      style={{ bottom: "21rem" }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">Study Reminders</h3>
          <button
            onClick={() => {
              setIsOpen(false);
              setShowReminder(false);
            }}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showReminder && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1 transition-colors">Time to Study! 📚</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 transition-colors">Keep your streak going with some practice today!</p>
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">Enable Reminders</span>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => {
                setSettings({ ...settings, enabled: e.target.checked });
                if (e.target.checked) {
                  requestPermission();
                }
              }}
              className="sr-only peer"
              style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
            />
            <div className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.enabled ? "bg-gray-900" : "bg-gray-200"
            }`}>
              <div className={`absolute top-[2px] left-[2px] bg-white dark:bg-gray-200 border border-gray-300 dark:border-gray-600 rounded-full h-5 w-5 transition-transform ${
                settings.enabled ? "translate-x-5" : "translate-x-0"
              }`}></div>
            </div>
          </label>

          {settings.enabled && (
            <>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block transition-colors">Reminder Time</label>
                <input
                  type="time"
                  value={settings.time}
                  onChange={(e) => setSettings({ ...settings, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block transition-colors">Frequency</label>
                <select
                  value={settings.frequency}
                  onChange={(e) => setSettings({ ...settings, frequency: e.target.value as "daily" | "weekly" })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

