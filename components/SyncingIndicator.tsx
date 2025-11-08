"use client";

import { useProblemHistory } from "@/hooks/useProblemHistory";
import { useChallengeHistory } from "@/hooks/useChallengeHistory";
import { useXPData } from "@/hooks/useXPData";
import { useStreakData } from "@/hooks/useStreakData";
import { useDailyGoals } from "@/hooks/useDailyGoals";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useAuth } from "@/contexts/AuthContext";

/**
 * SyncingIndicator - Shows when data is being synced to database
 * Displays a subtle indicator when any hook is syncing
 */
export default function SyncingIndicator() {
  const { user } = useAuth();
  const { isSyncing: isSyncingProblems } = useProblemHistory();
  const { isSyncing: isSyncingChallenges } = useChallengeHistory();
  const { isLoading: isLoadingXP } = useXPData();
  const { isLoading: isLoadingStreak } = useStreakData();
  const { isLoading: isLoadingGoals } = useDailyGoals();
  const { isLoading: isLoadingSessions } = useStudySessions();

  // Only show for logged-in users
  if (!user) {
    return null;
  }

  // Check if any sync is in progress
  const isSyncing = isSyncingProblems || isSyncingChallenges;
  const isLoading = isLoadingXP || isLoadingStreak || isLoadingGoals || isLoadingSessions;

  // Don't show if nothing is syncing/loading
  if (!isSyncing && !isLoading) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-sm">
      {isSyncing ? (
        <>
          <div className="w-3 h-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-700 dark:text-gray-300">Syncing...</span>
        </>
      ) : (
        <>
          <div className="w-3 h-3 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </>
      )}
    </div>
  );
}

