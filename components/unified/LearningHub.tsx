"use client";

import { useState, useEffect, useRef } from "react";
import { ParsedProblem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePanel } from "@/contexts/PanelContext";
import DashboardContent from "./DashboardContent";
import PracticeContent from "./PracticeContent";
import SuggestionsContent from "./SuggestionsContent";
import LearningPath from "../LearningPath";
import LearningGoals from "./LearningGoals";
import { DifficultyLevel } from "@/services/difficultyTracker";

interface LearningHubProps {
  onSelectProblem: (problem: ParsedProblem) => void;
  onDifficultyChange?: (difficulty: DifficultyLevel) => void;
  apiKey?: string;
  isGuestMode?: boolean;
  onSignUpClick?: () => void;
}

/**
 * Unified Learning Hub - Combines Dashboard, History, Practice, and Suggestions
 */
export default function LearningHub({ onSelectProblem, onDifficultyChange, apiKey, isGuestMode = false, onSignUpClick }: LearningHubProps) {
  const { user } = useAuth();
  const { activePanel, setActivePanel, isAnyPanelOpen } = usePanel();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "practice" | "suggestions" | "path" | "goals">("dashboard");
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Calculate vertical position - stack below UserMenu (logged in) or AuthButton (guest mode)
  // Both UserMenu and AuthButton are ~48px height + 1rem top = ~64px, buttons are 48px each + 8px gap
  const buttonIndex = 0; // First button
  const topOffset = `calc(max(1rem, env(safe-area-inset-top, 1rem)) + 4rem + 0rem)`;
  const rightOffset = 'max(1rem, env(safe-area-inset-right, 1rem))';

  // Sync local state with panel context
  useEffect(() => {
    if (isOpen) {
      setActivePanel("learning");
    } else {
      // Clear panel when closed
      if (activePanel === "learning") {
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
  const buttonZIndex = isAnyPanelOpen && activePanel !== "learning" ? 20 : 30;

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
        className="bg-gray-900 dark:bg-gray-700 text-white rounded-full p-3 shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 touch-device:min-h-[48px] touch-device:min-w-[48px]"
        aria-label="Open learning hub"
        title="Learning Hub"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
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
        zIndex: 50,
        maxWidth: 'calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))'
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col transition-all duration-200"
    >
      {/* Header with Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "dashboard"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("practice")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "practice"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "suggestions"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Suggestions
          </button>
          <button
            onClick={() => setActiveTab("path")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "path"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Path
          </button>
          <button
            onClick={() => setActiveTab("goals")}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "goals"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Goals
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
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === "dashboard" && <DashboardContent onDifficultyChange={onDifficultyChange} />}
        {activeTab === "practice" && <PracticeContent onStartPractice={onSelectProblem} apiKey={apiKey} />}
        {activeTab === "suggestions" && <SuggestionsContent onSelectProblem={onSelectProblem} />}
        {activeTab === "path" && <LearningPath onStartProblem={onSelectProblem} apiKey={apiKey} />}
        {activeTab === "goals" && <LearningGoals isGuestMode={isGuestMode} onSignUpClick={onSignUpClick} />}
      </div>
    </div>
  );
}

