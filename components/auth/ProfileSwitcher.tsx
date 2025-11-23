"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/useToast";

interface StudentAlert {
  profileId: string;
  hasAlert: boolean;
  alertType?: "inactivity" | "streak_lost" | "low_accuracy" | "goal_achieved";
  message?: string;
  daysInactive?: number;
  streak?: number;
}

export default function ProfileSwitcher() {
  const { user, activeProfile, profiles, profilesLoading, setActiveProfile, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Map<string, StudentAlert>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Fetch student alerts when profiles load
  useEffect(() => {
    if (!user || profiles.length === 0) return;

    const fetchAlerts = async () => {
      try {
        const profileIds = profiles.map(p => p.id).join(",");
        const response = await fetch(
          `/api/v2/student-alerts?userId=${user.id}&profileIds=${profileIds}`
        );
        const data = await response.json();

        if (data.success && data.alerts) {
          const alertMap = new Map<string, StudentAlert>();
          data.alerts.forEach((alert: StudentAlert) => {
            alertMap.set(alert.profileId, alert);
          });
          setAlerts(alertMap);
        }
      } catch (error) {
        logger.error("Error fetching student alerts", { error });
      }
    };

    fetchAlerts();
  }, [user, profiles]);

  // Count total alerts for badge
  const totalAlerts = Array.from(alerts.values()).filter(a => a.hasAlert).length;

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

  // For students: Hide switcher (they only have one profile)
  if (userRole === "student") {
    return null;
  }

  // For parents/teachers: Don't show if no profiles or loading
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
          <div className="relative">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
              {activeProfile ? activeProfile.name.charAt(0).toUpperCase() : "P"}
            </div>
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalAlerts}
              </span>
            )}
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
            {profiles.map((profile) => {
              const alert = alerts.get(profile.id);
              return (
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
                    <div className="relative">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {alert?.hasAlert && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-gray-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{profile.name}</div>
                      {alert?.hasAlert ? (
                        <div className={`text-xs truncate ${
                          alert.alertType === "inactivity" ? "text-orange-500" :
                          alert.alertType === "low_accuracy" ? "text-red-500" :
                          "text-yellow-500"
                        }`}>
                          {alert.message}
                        </div>
                      ) : profile.grade_level ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {profile.grade_level}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

