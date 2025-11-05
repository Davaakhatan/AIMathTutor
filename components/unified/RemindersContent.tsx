"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format
  frequency: "daily" | "weekly";
}

/**
 * Reminders Content - Study reminder settings
 */
export default function RemindersContent() {
  const [settings, setSettings] = useLocalStorage<ReminderSettings>("aitutor-reminders", {
    enabled: false,
    time: "18:00",
    frequency: "daily",
  });
  const [showReminder, setShowReminder] = useState(false);

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

  return (
    <div className="p-4 space-y-4">
      {showReminder && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors">
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1 transition-colors">Time to Study! 📚</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 transition-colors">Keep your streak going with some practice today!</p>
          <button
            onClick={() => setShowReminder(false)}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable Reminders</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Get notified when it's time to study</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
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
          <div className={`w-11 h-6 rounded-full transition-colors ${
            settings.enabled ? "bg-gray-900 dark:bg-gray-700" : "bg-gray-200"
          }`}>
            <div className={`absolute top-[2px] left-[2px] bg-white dark:bg-gray-200 border border-gray-300 dark:border-gray-600 rounded-full h-5 w-5 transition-transform ${
              settings.enabled ? "translate-x-5" : "translate-x-0"
            }`}></div>
          </div>
        </label>
      </div>

      {settings.enabled && (
        <>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">Reminder Time</label>
            <input
              type="time"
              value={settings.time}
              onChange={(e) => setSettings({ ...settings, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">Frequency</label>
            <select
              value={settings.frequency}
              onChange={(e) => setSettings({ ...settings, frequency: e.target.value as "daily" | "weekly" })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}

