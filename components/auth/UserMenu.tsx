"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import ProfileSwitcher from "./ProfileSwitcher";

export default function UserMenu() {
  const { user, signOut, profiles, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast("Signed out successfully", "success");
      setIsOpen(false);
    } catch (error) {
      showToast("Failed to sign out. Please try again.", "error");
    }
  };

  if (!user) return null;

  const displayName = user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split("@")[0] || "User";
  const email = user.email || "";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-white font-medium text-xs">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-900 dark:text-gray-100">
          {displayName}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
              {userRole && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                  {userRole}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{email}</p>
          </div>

          {/* Profile Switcher - only show if user has profiles */}
          {profiles.length > 0 && (
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <ProfileSwitcher />
            </div>
          )}

          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

