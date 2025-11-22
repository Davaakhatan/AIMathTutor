"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { setSoundEnabled, setSoundVolume } from "@/lib/soundEffects";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

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
  const { user, signOut } = useAuth();
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
  const [isDeleting, setIsDeleting] = useState(false);
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
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
          Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Customize your learning experience
        </p>
      </div>

      {/* General Settings Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">General</h3>
        </div>

        {/* Auto-save */}
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">Auto-save Problems</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automatically save to history</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
              className="sr-only peer"
              style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
            />
            <div className={`w-11 h-6 rounded-full transition-all shadow-inner ${
              settings.autoSave 
                ? "bg-gradient-to-r from-blue-500 to-purple-600" 
                : "bg-gray-300 dark:bg-gray-600"
            }`}>
              <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform shadow-md ${
                settings.autoSave ? "translate-x-5" : "translate-x-0"
              }`}></div>
            </div>
          </label>
        </div>

        {/* Voice */}
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">Voice Responses</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Read responses aloud</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.voiceEnabled}
              onChange={(e) => setSettings({ ...settings, voiceEnabled: e.target.checked })}
              className="sr-only peer"
              style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
            />
            <div className={`w-11 h-6 rounded-full transition-all shadow-inner ${
              settings.voiceEnabled 
                ? "bg-gradient-to-r from-green-500 to-emerald-600" 
                : "bg-gray-300 dark:bg-gray-600"
            }`}>
              <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform shadow-md ${
                settings.voiceEnabled ? "translate-x-5" : "translate-x-0"
              }`}></div>
            </div>
          </label>
        </div>

        {/* Show Stats */}
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">Show Statistics</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Display conversation stats</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showStats}
              onChange={(e) => setSettings({ ...settings, showStats: e.target.checked })}
              className="sr-only peer"
              style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
            />
            <div className={`w-11 h-6 rounded-full transition-all shadow-inner ${
              settings.showStats 
                ? "bg-gradient-to-r from-purple-500 to-pink-600" 
                : "bg-gray-300 dark:bg-gray-600"
            }`}>
              <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform shadow-md ${
                settings.showStats ? "translate-x-5" : "translate-x-0"
              }`}></div>
            </div>
          </label>
        </div>
      </div>

      {/* Appearance Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h3>
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">Dark Mode</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use dark theme</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
              className="sr-only peer"
              style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
            />
            <div className={`w-11 h-6 rounded-full transition-all shadow-inner ${
              settings.darkMode 
                ? "bg-gradient-to-r from-indigo-500 to-purple-600" 
                : "bg-gray-300 dark:bg-gray-600"
            }`}>
              <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform shadow-md ${
                settings.darkMode ? "translate-x-5" : "translate-x-0"
              }`}></div>
            </div>
          </label>
        </div>

        {/* Font Size */}
        <div className="p-3 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Font Size</label>
          </div>
          <div className="flex gap-2">
            {(["small", "medium", "large"] as const).map((size) => (
              <button
                key={size}
                onClick={() => setSettings({ ...settings, fontSize: size })}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
                  settings.fontSize === size
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audio Settings Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audio</h3>
        </div>

        {/* Sound Effects */}
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">Sound Effects</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Audio feedback for interactions</p>
            </div>
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
            <div className={`w-11 h-6 rounded-full transition-all shadow-inner ${
              settings.soundEffects 
                ? "bg-gradient-to-r from-pink-500 to-rose-600" 
                : "bg-gray-300 dark:bg-gray-600"
            }`}>
              <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform shadow-md ${
                settings.soundEffects ? "translate-x-5" : "translate-x-0"
              }`}></div>
            </div>
          </label>
        </div>

        {/* Sound Volume */}
        {settings.soundEffects && (
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Volume</label>
            </div>
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
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-pink-500 [&::-webkit-slider-thumb]:to-rose-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-pink-500 [&::-moz-range-thumb]:to-rose-600 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">
                {Math.round((settings.soundVolume ?? 0.5) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>


      {/* Data Backup & Restore Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Backup</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Export or restore your data</p>
          </div>
        </div>

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
          className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className={`w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer ${
              isImporting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isImporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Clear Local Data Card */}
      <div className="bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-900/20 rounded-2xl shadow-lg border-2 border-orange-200 dark:border-orange-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Clear Local Data</h3>
            <p className="text-xs text-orange-700 dark:text-orange-300">Remove all local storage</p>
          </div>
        </div>
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
            className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all text-sm font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Clear All Data</span>
          </button>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-3 text-center font-medium">
            ⚠️ This action cannot be undone
          </p>
      </div>

      {/* Delete Account (Only for authenticated users) - DANGER ZONE */}
      {user && (
        <div className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/40 dark:to-rose-950/40 rounded-2xl shadow-lg border-2 border-red-300 dark:border-red-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-gradient-to-br from-red-600 to-rose-700 rounded-lg shadow-lg animate-pulse">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-700 dark:text-red-300">⚠️ Danger Zone</h3>
              <p className="text-xs text-red-600 dark:text-red-400">Irreversible actions</p>
            </div>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-red-200 dark:border-red-700">
            <strong>Permanently delete your account</strong> and all associated data from the database. This action cannot be undone.
          </p>
          <button
            onClick={async () => {
              const confirmMessage = 
                "⚠️ DELETE ACCOUNT?\n\n" +
                "This will permanently delete:\n" +
                "• Your profile and authentication\n" +
                "• All XP, levels, and streaks\n" +
                "• All solved problems and history\n" +
                "• All achievements and progress\n" +
                "• All student profiles you created\n" +
                "• All chat sessions and summaries\n" +
                "• Everything related to your account\n\n" +
                "This action CANNOT be undone!\n\n" +
                "Type 'DELETE' below to confirm:";
              
              const confirmation = prompt(confirmMessage);
              
              if (confirmation !== "DELETE") {
                if (confirmation !== null) {
                  showToast("Account deletion cancelled. You must type 'DELETE' to confirm.", "info");
                }
                return;
              }

              setIsDeleting(true);
              
              try {
                logger.info("User initiated account deletion", { userId: user.id });
                
                const response = await fetch("/api/v2/account", {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || "Failed to delete account");
                }

                logger.info("Account deleted successfully", { userId: user.id });
                showToast("Account deleted successfully. Goodbye!", "success");

                // Clear all localStorage
                localStorage.clear();

                // Sign out and redirect
                setTimeout(async () => {
                  await signOut();
                  window.location.href = "/";
                }, 1500);
              } catch (error) {
                logger.error("Error deleting account", { error });
                showToast(
                  `Failed to delete account: ${error instanceof Error ? error.message : "Unknown error"}`,
                  "error"
                );
              } finally {
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold flex items-center justify-center gap-2 border-2 border-red-700 dark:border-red-600"
          >
            {isDeleting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting Account...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Delete Account Permanently</span>
              </>
            )}
          </button>
          <p className="text-xs text-red-700 dark:text-red-300 mt-3 text-center font-bold">
            🔥 This will delete ALL your data permanently from the database
          </p>
        </div>
      )}

      {/* Reset Settings */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reset Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Restore default preferences</p>
          </div>
        </div>
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
              showToast("Settings reset to defaults", "success");
            }
          }}
          className="w-full px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all text-sm font-semibold flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset to Default Settings</span>
        </button>
      </div>
    </div>
  );
}

