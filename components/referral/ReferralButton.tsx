"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePanel } from "@/contexts/PanelContext";
import ReferralDashboard from "./ReferralDashboard";

/**
 * Standalone Referral Button - Fixed position button for referrals
 */
export default function ReferralButton() {
  const { user } = useAuth();
  const { activePanel, setActivePanel, isAnyPanelOpen } = usePanel();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Calculate position - stack below other buttons
  // Button index: 5 (after SettingsMenu which is 4)
  const buttonIndex = 5;
  const topOffset = `calc(max(1rem, env(safe-area-inset-top, 1rem)) + 4rem + ${buttonIndex * 3.5}rem)`;
  const rightOffset = 'max(1rem, env(safe-area-inset-right, 1rem))';

  // Sync local state with panel context
  useEffect(() => {
    if (isOpen) {
      setActivePanel("referrals");
    } else {
      if (activePanel === "referrals") {
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

  // Adjust z-index: button behind panel when another panel is open
  const buttonZIndex = isAnyPanelOpen && activePanel !== "referrals" ? 20 : 60;

  // Don't show for guest users
  if (!user) return null;

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
        aria-label="Open referrals"
        title="Referrals"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
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
        zIndex: 60,
        maxWidth: 'calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))',
        height: 'calc(100vh - max(1rem, env(safe-area-inset-top, 1rem)) - 4rem - 17.5rem - 1rem)',
        maxHeight: 'calc(100vh - max(1rem, env(safe-area-inset-top, 1rem)) - 4rem - 17.5rem - 1rem)'
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] flex flex-col transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Referrals
        </h2>
        <button
          onClick={handleClose}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <ReferralDashboard />
      </div>
    </div>
  );
}

