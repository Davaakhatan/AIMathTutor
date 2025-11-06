"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { setSoundEnabled, setSoundVolume } from "@/lib/soundEffects";

interface Settings {
  autoSave: boolean;
  voiceEnabled: boolean;
  showStats: boolean;
  fontSize: "small" | "medium" | "large";
  darkMode: boolean;
  soundEffects?: boolean; // Sound effects enabled/disabled
  soundVolume?: number; // Volume 0-1
  apiKey?: string; // Optional: For display/validation only (server-side still uses env var)
}

export default function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useLocalStorage<Settings>("aitutor-settings", {
    autoSave: true,
    voiceEnabled: true,
    showStats: true,
    fontSize: "medium",
    darkMode: false,
    soundEffects: true, // Default to enabled
    soundVolume: 0.5, // Default volume (50%)
  });
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

      // Apply font size to document
      useEffect(() => {
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          root.style.fontSize = settings.fontSize === "small" ? "14px" : settings.fontSize === "large" ? "18px" : "16px";
        }
      }, [settings.fontSize]);

      // Apply sound settings on mount and when settings change
      useEffect(() => {
        if (typeof window !== "undefined") {
          setSoundEnabled(settings.soundEffects ?? true);
          setSoundVolume(settings.soundVolume ?? 0.5);
        }
      }, [settings.soundEffects, settings.soundVolume]);

  // Apply dark mode to document
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

  // Initialize dark mode on mount (check system preference)
  useEffect(() => {
    if (typeof window !== "undefined" && !settings.darkMode && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      // Optional: auto-detect system preference on first load
      // Uncomment if you want auto dark mode based on system
      // setSettings({ ...settings, darkMode: true });
    }
  }, [settings.darkMode]); // Only run once on mount, darkMode check is intentional
  
  // Notify parent component of voice setting changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("settingsChanged", { 
      detail: { voiceEnabled: settings.voiceEnabled } 
    }));
  }, [settings.voiceEnabled]);

  if (!isOpen) {
        return (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-gray-700 text-white rounded-full p-3 sm:p-3 shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 touch-device:min-h-[48px] touch-device:min-w-[48px]"
            aria-label="Open settings"
            title="Settings"
          >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed top-4 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col transition-all duration-200"
      style={{ right: "5rem" }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Settings</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Close settings"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900">
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
            <div className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.autoSave ? "bg-gray-900" : "bg-gray-200"
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
            <div className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.voiceEnabled ? "bg-gray-900" : "bg-gray-200"
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
            <div className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.showStats ? "bg-gray-900" : "bg-gray-200"
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
            <div className={`w-11 h-6 rounded-full transition-colors relative ${
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

        {/* API Key Info */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block transition-colors">OpenAI API Key</label>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 transition-colors">
            <p className="text-xs text-blue-900 dark:text-blue-200 mb-2 transition-colors">
              <strong>Note:</strong> For production, set <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">OPENAI_API_KEY</code> in AWS Amplify environment variables. Or enter your key here as a fallback.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 transition-colors">
              For Amplify: Go to App Settings → Environment Variables → Add <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">OPENAI_API_KEY</code>
            </p>
          </div>
          <div className="mt-2">
            <input
              type="password"
              placeholder="Enter API key (fallback if env var not working)"
              value={settings.apiKey || ""}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
              title="Enter your OpenAI API key as a fallback if environment variable isn't working"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
              This will be used as a fallback if the environment variable isn&apos;t available. Your key is stored locally in your browser.
            </p>
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
                <div className={`w-11 h-6 rounded-full transition-colors relative ${
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
    </div>
  );
}

