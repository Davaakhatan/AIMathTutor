"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

/**
 * Component for parents/teachers to connect to students via link code
 */
export default function ConnectViaLinkForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user, refreshProfiles } = useAuth();
  const [linkCode, setLinkCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const { showToast } = useToast();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!linkCode.trim()) {
      showToast("Please enter a connection code", "error");
      return;
    }

    if (!user) {
      showToast("Please sign in to connect to students", "error");
      return;
    }

    try {
      setIsConnecting(true);

      const response = await fetch("/api/connect-via-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkCode: linkCode.trim(),
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect to student");
      }

      showToast(data.message || "Successfully connected to student!", "success");
      setLinkCode("");

      // Refresh profiles to show the new linked student
      if (refreshProfiles) {
        await refreshProfiles();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error("Error connecting via link", { error });
      const errorMessage = error instanceof Error ? error.message : "Failed to connect. Please try again.";
      showToast(errorMessage, "error");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Connect via Link Code
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Ask the student for their connection code or link, then enter it here to connect.
        </p>
      </div>

      <form onSubmit={handleConnect} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Connection Code
          </label>
          <input
            type="text"
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value)}
            placeholder="Enter connection code or paste link"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 font-mono"
            disabled={isConnecting}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            You can paste the full link or just the code
          </p>
        </div>

        <button
          type="submit"
          disabled={isConnecting || !linkCode.trim()}
          className="w-full px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </button>
      </form>
    </div>
  );
}

