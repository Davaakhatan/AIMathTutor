"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/contexts/AuthContext";
import { usePanel } from "@/contexts/PanelContext";
import SettingsContent from "./SettingsContent";
import NotificationsContent from "./NotificationsContent";
import RemindersContent from "./RemindersContent";
import ProfileManager from "@/components/auth/ProfileManager";

interface SettingsMenuProps {
  isGuestMode?: boolean;
  onSignUpClick?: () => void;
}

/**
 * Unified Settings Menu - Combines Settings, Notifications, XP System, and Reminders
 */
export default function SettingsMenu({ isGuestMode, onSignUpClick }: SettingsMenuProps) {
  const { user } = useAuth();
  const { activePanel, setActivePanel, isAnyPanelOpen } = usePanel();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "notifications" | "reminders" | "profiles">("settings");
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [xpData] = useLocalStorage<any>("aitutor-xp", { totalXP: 0, level: 1, problemsSolved: 0 });
  const [notifications] = useLocalStorage<any[]>("aitutor-notifications", []);
  
  // Calculate vertical position - stack below UserMenu (logged in) or AuthButton (guest mode)
  const buttonIndex = 3; // Fourth button
  const topOffset = `calc(max(1rem, env(safe-area-inset-top, 1rem)) + 4rem + 10.5rem)`;
  const rightOffset = 'max(1rem, env(safe-area-inset-right, 1rem))';
  
  // Only calculate after mount to avoid hydration mismatch
  const unreadCount = isMounted ? notifications.filter((n: any) => !n.read).length : 0;
  const showBadge = isMounted && (unreadCount > 0 || (xpData && xpData.level > 1));

  // Set mounted state after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync local state with panel context
  useEffect(() => {
    if (isOpen) {
      setActivePanel("settings");
    } else {
      if (activePanel === "settings") {
        setActivePanel(null);
      }
    }
  }, [isOpen, activePanel, setActivePanel]);

  const handleClose = () => {
    setIsOpen(false);
    setActivePanel(null);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Adjust z-index: buttons behind panel when another panel is open
  const buttonZIndex = isAnyPanelOpen && activePanel !== "settings" ? 20 : 60;


  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{ 
          position: 'fixed', 
          top: topOffset, 
          right: rightOffset, 
          zIndex: buttonZIndex,
          transition: 'z-index 0.2s ease-in-out'
        }}
        className="bg-gray-900 dark:bg-gray-700 text-white rounded-full p-3 sm:p-3 shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 touch-device:min-h-[48px] touch-device:min-w-[48px] relative"
        aria-label="Open settings menu"
        title="Settings Menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {showBadge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 0 ? unreadCount : "!"}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{ 
        position: 'fixed', 
        top: topOffset, 
        right: rightOffset, 
        zIndex: 60,
        maxWidth: 'calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))',
        height: 'calc(100vh - max(1rem, env(safe-area-inset-top, 1rem)) - 4rem - 10.5rem - 1rem)',
        maxHeight: 'calc(100vh - max(1rem, env(safe-area-inset-top, 1rem)) - 4rem - 10.5rem - 1rem)'
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] flex flex-col transition-all duration-200"
    >
      {/* Header with Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "settings"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors relative ${
              activeTab === "notifications"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("reminders")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "reminders"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Reminders
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("profiles")}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "profiles"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Profiles
            </button>
          )}
        </div>
        <button
          onClick={handleClose}
          className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === "settings" && <SettingsContent />}
        {activeTab === "notifications" && <NotificationsContent />}
        {activeTab === "reminders" && <RemindersContent />}
        {activeTab === "profiles" && user && (
          <div className="p-4 pb-6">
            <ProfileManager />
          </div>
        )}
      </div>
    </div>
  );
}

