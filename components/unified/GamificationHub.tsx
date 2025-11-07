"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePanel } from "@/contexts/PanelContext";
import AchievementsContent from "./AchievementsContent";
import LeaderboardContent from "./LeaderboardContent";

interface GamificationHubProps {
  currentXP: number;
  currentLevel: number;
  currentProblemsSolved: number;
  currentStreak: number;
  isGuestMode?: boolean;
  onSignUpClick?: () => void;
}

/**
 * Unified Gamification Hub - Combines Achievements and Leaderboard
 */
export default function GamificationHub({
  currentXP,
  currentLevel,
  currentProblemsSolved,
  currentStreak,
  isGuestMode,
  onSignUpClick,
}: GamificationHubProps) {
  const { user } = useAuth();
  const { activePanel, setActivePanel, isAnyPanelOpen } = usePanel();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"achievements" | "leaderboard">("achievements");
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Calculate vertical position - stack below UserMenu (logged in) or AuthButton (guest mode)
  const buttonIndex = 1; // Second button
  const topOffset = `calc(max(1rem, env(safe-area-inset-top, 1rem)) + 4rem + 3.5rem)`;
  const rightOffset = 'max(1rem, env(safe-area-inset-right, 1rem))';

  // Sync local state with panel context
  useEffect(() => {
    if (isOpen) {
      setActivePanel("gamification");
    } else {
      if (activePanel === "gamification") {
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
  const buttonZIndex = isAnyPanelOpen && activePanel !== "gamification" ? 20 : 30;

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
        className="bg-gray-900 dark:bg-gray-700 text-white rounded-full p-3 shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 touch-device:min-h-[48px] touch-device:min-w-[48px] relative"
        aria-label="Open gamification hub"
        title="Gamification Hub"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
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
        zIndex: 40,
        maxWidth: 'calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))'
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col transition-all duration-200"
    >
      {/* Header with Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1">
          <button
            onClick={() => setActiveTab("achievements")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "achievements"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Achievements
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "leaderboard"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Leaderboard
          </button>
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
      <div className="flex-1 overflow-hidden">
        {activeTab === "achievements" && <AchievementsContent />}
        {activeTab === "leaderboard" && (
          <LeaderboardContent
            currentXP={currentXP}
            currentLevel={currentLevel}
            currentProblemsSolved={currentProblemsSolved}
            currentStreak={currentStreak}
          />
        )}
      </div>
    </div>
  );
}

