"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

/**
 * Component for students to generate and share their connection link
 */
export default function StudentConnectionLink() {
  const { activeProfile, userRole, profiles } = useAuth();
  const [connectionLink, setConnectionLink] = useState<string>("");
  const [connectionCode, setConnectionCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  // For students: use first profile from profiles array (activeProfile is always null for students)
  const studentProfile = userRole === "student" && profiles.length > 0 ? profiles[0] : activeProfile;

  useEffect(() => {
    if (studentProfile && userRole === "student") {
      // Generate connection link
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${baseUrl}/connect/${studentProfile.id}`;
      setConnectionLink(link);
      
      // Connection code is just the profile ID (can be encrypted later)
      setConnectionCode(studentProfile.id);
    }
  }, [studentProfile, userRole]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(connectionLink);
      setCopied(true);
      showToast("Connection link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error("Error copying link", { error });
      showToast("Failed to copy link. Please copy manually.", "error");
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(connectionCode);
      setCopied(true);
      showToast("Connection code copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error("Error copying code", { error });
      showToast("Failed to copy code. Please copy manually.", "error");
    }
  };

  if (userRole !== "student" || !studentProfile) {
    return null;
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          Share Connection Link
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Share this link or code with a parent or teacher to let them connect to your profile.
        </p>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Connection Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={connectionLink}
              readOnly
              className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 text-xs font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Connection Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={connectionCode}
              readOnly
              className="flex-1 px-3 py-2 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleCopyCode}
              className="px-3 py-2 text-xs font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Parents/teachers can enter this code to connect
          </p>
        </div>
      </div>
    </div>
  );
}

