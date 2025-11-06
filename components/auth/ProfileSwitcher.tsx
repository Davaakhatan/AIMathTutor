"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/useToast";

export default function ProfileSwitcher() {
  const { activeProfile, profiles, profilesLoading, setActiveProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleProfileSelect = async (profileId: string | null) => {
    try {
      await setActiveProfile(profileId);
      setIsOpen(false);
      showToast(
        profileId 
          ? `Switched to ${profiles.find(p => p.id === profileId)?.name || "profile"}`
          : "Switched to personal profile",
        "success"
      );
    } catch (error) {
      logger.error("Error switching profile", { error });
      showToast("Failed to switch profile. Please try again.", "error");
    }
  };

  // Don't show if no profiles or loading
  if (profilesLoading || profiles.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Switch student profile"
        aria-expanded={isOpen}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="max-w-[120px] truncate">
          {activeProfile ? activeProfile.name : "Personal"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="p-2">
            {/* Personal profile option */}
            <button
              onClick={() => handleProfileSelect(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                !activeProfile
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="font-medium">Personal</span>
                {!activeProfile && (
                  <span className="ml-auto text-xs">Active</span>
                )}
              </div>
            </button>

            {/* Divider */}
            {profiles.length > 0 && (
              <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
            )}

            {/* Student profiles */}
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleProfileSelect(profile.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeProfile?.id === profile.id
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{profile.name}</div>
                    {profile.grade_level && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {profile.grade_level}
                      </div>
                    )}
                  </div>
                  {activeProfile?.id === profile.id && (
                    <span className="ml-auto text-xs">Active</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

