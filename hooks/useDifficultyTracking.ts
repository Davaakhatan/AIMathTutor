import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { Message, ParsedProblem } from "@/types";
import {
  updateDifficultyPerformance,
  DifficultyTrackingData,
  DifficultyLevel,
  getDefaultTrackingData,
} from "@/services/difficultyTracker";

/**
 * Hook to track difficulty performance when problems are solved
 */
export function useDifficultyTracking(
  problem: ParsedProblem | null,
  messages: Message[],
  isSolved: boolean,
  difficultyMode?: DifficultyLevel
) {
  const [trackingData, setTrackingData] = useLocalStorage<DifficultyTrackingData>(
    "aitutor-difficulty-tracking",
    getDefaultTrackingData()
  );

  useEffect(() => {
    if (!problem || !difficultyMode || messages.length === 0) return;

    // Only track when problem is completed (solved or abandoned)
    // We'll track both solved and unsolved attempts for better recommendations
    const wasSolved = isSolved;

    // Count attempts (rough estimate: number of exchanges / 4 suggests attempt)
    // A complete attempt typically involves 4-6 exchanges
    const exchanges = messages.length;
    const attempts = Math.max(1, Math.ceil(exchanges / 5));

    // Count hints used
    const hintsUsed = messages.filter(
      (m) =>
        m.role === "tutor" &&
        (m.content.startsWith("💡 Hint:") ||
          (m.content.startsWith("💡") && m.content.toLowerCase().includes("hint")) ||
          /^hint\s*:/i.test(m.content.trim()))
    ).length;

    // Estimate time spent (rough estimate: 1-2 minutes per exchange)
    const timeSpent = Math.max(0.5, Math.round((exchanges * 1.5) / 10) / 10); // At least 0.5 minutes

    // Update difficulty performance
    const updatedData = updateDifficultyPerformance(
      difficultyMode,
      wasSolved,
      attempts,
      timeSpent,
      hintsUsed,
      trackingData
    );

    setTrackingData(updatedData);
  }, [isSolved, problem?.text, difficultyMode]); // Only run when problem is solved or problem changes
}

