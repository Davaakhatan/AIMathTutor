"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { setSoundEnabled, setSoundVolume } from "@/lib/soundEffects";
import { useToast } from "@/hooks/useToast";

interface Settings {
  autoSave: boolean;
  voiceEnabled: boolean;
  showStats: boolean;
  fontSize: "small" | "medium" | "large";
  darkMode: boolean;
  soundEffects?: boolean;
  soundVolume?: number;
  apiKey?: string;
}

/**
 * Settings Content - Just the settings form (no panel wrapper)
 */
export default function SettingsContent() {
  const [settings, setSettings] = useLocalStorage<Settings>("aitutor-settings", {
    autoSave: true,
    voiceEnabled: true,
    showStats: true,
    fontSize: "medium",
    darkMode: false,
    soundEffects: true,
    soundVolume: 0.5,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Apply font size
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.fontSize = settings.fontSize === "small" ? "14px" : settings.fontSize === "large" ? "18px" : "16px";
    }
  }, [settings.fontSize]);

  // Apply sound settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSoundEnabled(settings.soundEffects ?? true);
      setSoundVolume(settings.soundVolume ?? 0.5);
    }
  }, [settings.soundEffects, settings.soundVolume]);

  // Apply dark mode
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (settings.darkMode) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [settings.darkMode]);

  // Notify parent of voice setting changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("settingsChanged", { 
      detail: { voiceEnabled: settings.voiceEnabled } 
    }));
  }, [settings.voiceEnabled]);

  return (
    <div className="p-4 space-y-4">
      {/* Auto-save */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-save Problems</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automatically save problems to history</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoSave}
            onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
            className="sr-only peer"
            style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
          />
          <div className={`w-11 h-6 rounded-full transition-colors ${
            settings.autoSave ? "bg-gray-900 dark:bg-gray-700" : "bg-gray-200"
          }`}>
            <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
              settings.autoSave ? "translate-x-5" : "translate-x-0"
            }`}></div>
          </div>
        </label>
      </div>

      {/* Voice */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Voice Responses</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Read tutor responses aloud</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.voiceEnabled}
            onChange={(e) => setSettings({ ...settings, voiceEnabled: e.target.checked })}
            className="sr-only peer"
            style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
          />
          <div className={`w-11 h-6 rounded-full transition-colors ${
            settings.voiceEnabled ? "bg-gray-900 dark:bg-gray-700" : "bg-gray-200"
          }`}>
            <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
              settings.voiceEnabled ? "translate-x-5" : "translate-x-0"
            }`}></div>
          </div>
        </label>
      </div>

      {/* Show Stats */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Show Statistics</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Display conversation stats</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showStats}
            onChange={(e) => setSettings({ ...settings, showStats: e.target.checked })}
            className="sr-only peer"
            style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
          />
          <div className={`w-11 h-6 rounded-full transition-colors ${
            settings.showStats ? "bg-gray-900 dark:bg-gray-700" : "bg-gray-200"
          }`}>
            <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
              settings.showStats ? "translate-x-5" : "translate-x-0"
            }`}></div>
          </div>
        </label>
      </div>

      {/* Dark Mode */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use dark theme</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
            className="sr-only peer"
            style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
          />
          <div className={`w-11 h-6 rounded-full transition-colors ${
            settings.darkMode ? "bg-gray-900 dark:bg-gray-700" : "bg-gray-200"
          }`}>
            <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
              settings.darkMode ? "translate-x-5" : "translate-x-0"
            }`}></div>
          </div>
        </label>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">Font Size</label>
        <div className="flex gap-2">
          {(["small", "medium", "large"] as const).map((size) => (
            <button
              key={size}
              onClick={() => setSettings({ ...settings, fontSize: size })}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                settings.fontSize === size
                  ? "bg-gray-900 text-white dark:bg-gray-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sound Effects */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Sound Effects</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Audio feedback for interactions</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.soundEffects ?? true}
            onChange={(e) => {
              setSettings({ ...settings, soundEffects: e.target.checked });
              setSoundEnabled(e.target.checked);
            }}
            className="sr-only peer"
            style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
          />
          <div className={`w-11 h-6 rounded-full transition-colors ${
            settings.soundEffects ? "bg-gray-900 dark:bg-gray-700" : "bg-gray-200"
          }`}>
            <div className={`absolute top-[2px] left-[2px] bg-white dark:bg-gray-200 border border-gray-300 dark:border-gray-600 rounded-full h-5 w-5 transition-transform ${
              settings.soundEffects ? "translate-x-5" : "translate-x-0"
            }`}></div>
          </div>
        </label>
      </div>

      {/* Sound Volume */}
      {settings.soundEffects && (
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">Sound Volume</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.soundVolume ?? 0.5}
              onChange={(e) => {
                const volume = parseFloat(e.target.value);
                setSettings({ ...settings, soundVolume: volume });
                setSoundVolume(volume);
              }}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-gray-700"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">
              {Math.round((settings.soundVolume ?? 0.5) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* API Key Info */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">OpenAI API Key</label>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-2">
          <p className="text-xs text-blue-900 dark:text-blue-200 mb-1">
            <strong>Note:</strong> Set <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">OPENAI_API_KEY</code> in environment variables, or enter your key here as a fallback.
          </p>
        </div>
        <input
          type="password"
          placeholder="Enter API key (fallback)"
          value={settings.apiKey || ""}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Data Backup & Restore */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Data Backup & Restore</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Export all your learning data or restore from a backup.
        </p>

        {/* Export */}
        <button
          onClick={() => {
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
          }}
          disabled={isExporting}
          className="w-full mb-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center justify-center gap-2"
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
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setIsImporting(true);
              const reader = new FileReader();

              reader.onload = (event) => {
                try {
                  const content = event.target?.result as string;
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
            }}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className={`w-full mb-3 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center justify-center gap-2 cursor-pointer ${
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
            onClick={() => {
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
            }}
            className="w-full px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 active:scale-95 transition-all text-sm font-medium flex items-center justify-center gap-2"
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
      </div>

      {/* Reset */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            if (confirm("Reset all settings to default?")) {
              setSettings({
                autoSave: true,
                voiceEnabled: true,
                showStats: true,
                fontSize: "medium",
                darkMode: false,
                soundEffects: true,
                soundVolume: 0.5,
              });
            }
          }}
          className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

