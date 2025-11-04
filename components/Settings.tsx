"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Settings {
  autoSave: boolean;
  voiceEnabled: boolean;
  showStats: boolean;
  fontSize: "small" | "medium" | "large";
}

export default function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useLocalStorage<Settings>("aitutor-settings", {
    autoSave: true,
    voiceEnabled: true,
    showStats: true,
    fontSize: "medium",
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
        className="fixed top-4 right-4 z-50 bg-gray-900 text-white rounded-full p-3 shadow-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
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
      className="fixed top-4 z-50 bg-white border border-gray-200 rounded-lg shadow-xl w-80 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col transition-all duration-200"
      style={{ right: "5rem" }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Settings</h3>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Auto-save */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Auto-save Problems</label>
            <p className="text-xs text-gray-500 mt-0.5">Automatically save problems to history</p>
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
            <label className="text-sm font-medium text-gray-900">Voice Responses</label>
            <p className="text-xs text-gray-500 mt-0.5">Read tutor responses aloud</p>
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
            <label className="text-sm font-medium text-gray-900">Show Statistics</label>
            <p className="text-xs text-gray-500 mt-0.5">Display conversation stats</p>
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

        {/* Font Size */}
        <div>
          <label className="text-sm font-medium text-gray-900 mb-2 block">Font Size</label>
          <div className="flex gap-2">
            {(["small", "medium", "large"] as const).map((size) => (
              <button
                key={size}
                onClick={() => setSettings({ ...settings, fontSize: size })}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  settings.fontSize === size
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => {
              if (confirm("Reset all settings to default?")) {
                setSettings({
                  autoSave: true,
                  voiceEnabled: true,
                  showStats: true,
                  fontSize: "medium",
                });
              }
            }}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

