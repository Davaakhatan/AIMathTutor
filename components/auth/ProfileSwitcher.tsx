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
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Switch student profile"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {activeProfile ? activeProfile.name.charAt(0).toUpperCase() : "P"}
          </div>
          <span className="truncate">
            {activeProfile ? activeProfile.name : "Personal"}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
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
        <div className="absolute top-full left-0 mt-1.5 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          <div className="p-1.5">
            {/* Personal profile option */}
            <button
              onClick={() => handleProfileSelect(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                !activeProfile
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-white text-xs font-medium">
                  P
                </div>
                <span className="font-medium">Personal</span>
              </div>
            </button>

            {/* Divider */}
            {profiles.length > 0 && (
              <div className="my-1.5 border-t border-gray-200 dark:border-gray-700"></div>
            )}

            {/* Student profiles */}
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleProfileSelect(profile.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeProfile?.id === profile.id
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-white text-xs font-medium">
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
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

