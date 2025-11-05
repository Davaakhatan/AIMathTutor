"use client";

import { useState, useRef } from "react";
import { useToast } from "@/hooks/useToast";

/**
 * Comprehensive Data Backup and Restore
 * Export all user data (XP, streaks, problems, bookmarks, sessions, settings, etc.)
 * and restore from backup
 */
export default function DataBackup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const exportAllData = () => {
    setIsExporting(true);
    try {
      // Collect all localStorage data
      const data = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        settings: localStorage.getItem("aitutor-settings"),
        problemHistory: localStorage.getItem("aitutor-problem-history"),
        bookmarks: localStorage.getItem("aitutor-bookmarks"),
        xpData: localStorage.getItem("aitutor-xp"),
        streakData: localStorage.getItem("aitutor-streak"),
        studySessions: localStorage.getItem("aitutor-study-sessions"),
        dailyGoals: localStorage.getItem("aitutor-daily-goals"),
        achievements: localStorage.getItem("aitutor-achievements"),
        leaderboard: localStorage.getItem("aitutor-leaderboard"),
        lastStudy: localStorage.getItem("aitutor-last-study"),
        userId: localStorage.getItem("aitutor-user-id"),
        username: localStorage.getItem("aitutor-username"),
      };

      // Parse JSON strings to objects for better readability
      const parsedData: any = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key === "version" || key === "exportedAt") {
          parsedData[key] = value;
        } else if (value) {
          try {
            parsedData[key] = JSON.parse(value);
          } catch {
            parsedData[key] = value;
          }
        }
      });

      // Create and download file
      const blob = new Blob([JSON.stringify(parsedData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aitutor-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("Data exported successfully!", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to export data. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validate backup format
        if (!data.version || !data.exportedAt) {
          throw new Error("Invalid backup file format");
        }

        // Restore data with confirmation
        const confirmed = confirm(
          "This will replace all your current data. Are you sure you want to continue?"
        );

        if (!confirmed) {
          setIsImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }

        // Restore each data item
        const restoreData = (key: string, value: any) => {
          if (value !== null && value !== undefined) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        };

        if (data.settings) restoreData("aitutor-settings", data.settings);
        if (data.problemHistory) restoreData("aitutor-problem-history", data.problemHistory);
        if (data.bookmarks) restoreData("aitutor-bookmarks", data.bookmarks);
        if (data.xpData) restoreData("aitutor-xp", data.xpData);
        if (data.streakData) restoreData("aitutor-streak", data.streakData);
        if (data.studySessions) restoreData("aitutor-study-sessions", data.studySessions);
        if (data.dailyGoals) restoreData("aitutor-daily-goals", data.dailyGoals);
        if (data.achievements) restoreData("aitutor-achievements", data.achievements);
        if (data.leaderboard) restoreData("aitutor-leaderboard", data.leaderboard);
        if (data.lastStudy) localStorage.setItem("aitutor-last-study", String(data.lastStudy));
        if (data.userId) localStorage.setItem("aitutor-user-id", String(data.userId));
        if (data.username) localStorage.setItem("aitutor-username", String(data.username));

        showToast("Data imported successfully! Please refresh the page.", "success");
        
        // Refresh after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error("Import failed:", error);
        showToast("Failed to import data. Invalid backup file.", "error");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      showToast("Failed to read backup file.", "error");
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  const clearAllData = () => {
    const confirmed = confirm(
      "⚠️ WARNING: This will delete ALL your data including:\n" +
      "- Problem history\n" +
      "- Bookmarks\n" +
      "- XP and levels\n" +
      "- Study streaks\n" +
      "- Achievements\n" +
      "- Settings\n\n" +
      "This cannot be undone! Are you absolutely sure?"
    );

    if (!confirmed) return;

    const confirmedAgain = confirm("Are you REALLY sure? This is your last chance!");
    if (!confirmedAgain) return;

    try {
      // Clear all localStorage keys
      const keys = [
        "aitutor-settings",
        "aitutor-problem-history",
        "aitutor-bookmarks",
        "aitutor-xp",
        "aitutor-streak",
        "aitutor-study-sessions",
        "aitutor-daily-goals",
        "aitutor-achievements",
        "aitutor-leaderboard",
        "aitutor-last-study",
        "aitutor-user-id",
        "aitutor-username",
      ];

      keys.forEach((key) => localStorage.removeItem(key));

      showToast("All data cleared. Refreshing page...", "info");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Clear failed:", error);
      showToast("Failed to clear data.", "error");
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-52 z-40 hidden sm:block bg-gray-600 dark:bg-gray-700 text-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-600 active:scale-95 transition-all min-h-[44px] touch-device:min-h-[48px] focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2"
        aria-label="Data backup"
        title="Backup & Restore"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
        <span className="text-sm font-medium">Backup</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-64 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 max-w-[calc(100vw-2rem)] transition-colors">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">Data Backup & Restore</h3>
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

      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors">
            Export all your learning data (XP, streaks, problems, bookmarks, settings, etc.) or restore from a backup.
          </p>
        </div>

        {/* Export */}
        <button
          onClick={exportAllData}
          disabled={isExporting}
          className="w-full px-4 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Export All Data</span>
            </>
          )}
        </button>

        {/* Import */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importData}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className={`w-full px-4 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center justify-center gap-2 cursor-pointer ${
              isImporting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                <span>Import from Backup</span>
              </>
            )}
          </label>
        </div>

        {/* Clear All Data */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={clearAllData}
            className="w-full px-4 py-2.5 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 active:scale-95 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Clear All Data</span>
          </button>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center transition-colors">
            ⚠️ This action cannot be undone
          </p>
        </div>

        {/* Info */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center transition-colors">
            💡 Tip: Export your data regularly to keep it safe!
          </p>
        </div>
      </div>
    </div>
  );
}

