/**
 * Difficulty Performance Tracking Service
 * Tracks student performance across difficulty levels and recommends optimal difficulty
 */

export type DifficultyLevel = "elementary" | "middle" | "high" | "advanced";

export interface DifficultyPerformance {
  difficulty: DifficultyLevel;
  problemsAttempted: number;
  problemsSolved: number;
  averageAttempts: number; // Average attempts per problem
  averageTime: number; // Average time in minutes
  averageHints: number; // Average hints used
  successRate: number; // 0-100 percentage
  lastAttempted: number; // Timestamp
  masteryScore: number; // 0-100 overall mastery score for this difficulty
}

export interface DifficultyTrackingData {
  performances: Record<DifficultyLevel, DifficultyPerformance>;
  lastUpdated: number;
  recommendedDifficulty?: DifficultyLevel;
  autoAdjustEnabled: boolean;
}

/**
 * Initialize default performance data
 */
function createDefaultPerformance(difficulty: DifficultyLevel): DifficultyPerformance {
  return {
    difficulty,
    problemsAttempted: 0,
    problemsSolved: 0,
    averageAttempts: 0,
    averageTime: 0,
    averageHints: 0,
    successRate: 0,
    lastAttempted: 0,
    masteryScore: 50, // Start at neutral
  };
}

/**
 * Get default tracking data
 */
export function getDefaultTrackingData(): DifficultyTrackingData {
  return {
    performances: {
      elementary: createDefaultPerformance("elementary"),
      middle: createDefaultPerformance("middle"),
      high: createDefaultPerformance("high"),
      advanced: createDefaultPerformance("advanced"),
    },
    lastUpdated: Date.now(),
    recommendedDifficulty: "middle",
    autoAdjustEnabled: true,
  };
}

/**
 * Update performance for a difficulty level
 */
export function updateDifficultyPerformance(
  difficulty: DifficultyLevel,
  wasSolved: boolean,
  attempts: number = 1,
  timeSpent: number = 0, // in minutes
  hintsUsed: number = 0,
  existingData?: DifficultyTrackingData
): DifficultyTrackingData {
  const data = existingData || getDefaultTrackingData();
  const currentPerf = data.performances[difficulty] || createDefaultPerformance(difficulty);

  // Update statistics
  const newAttempts = currentPerf.problemsAttempted + 1;
  const newSolved = currentPerf.problemsSolved + (wasSolved ? 1 : 0);
  const newAvgAttempts = (currentPerf.averageAttempts * currentPerf.problemsAttempted + attempts) / newAttempts;
  const newAvgTime = timeSpent > 0
    ? (currentPerf.averageTime * currentPerf.problemsAttempted + timeSpent) / newAttempts
    : currentPerf.averageTime;
  const newAvgHints = (currentPerf.averageHints * currentPerf.problemsAttempted + hintsUsed) / newAttempts;

  // Calculate success rate
  const successRate = (newSolved / newAttempts) * 100;

  // Calculate mastery score (0-100)
  // Based on: success rate (60%), hint usage (20%), time efficiency (15%), attempts (5%)
  const hintScore = Math.max(0, 100 - (newAvgHints * 15)); // Penalize high hint usage
  const timeScore = newAvgTime > 0
    ? Math.max(0, 100 - (newAvgTime * 5)) // Penalize very slow solving
    : 50; // Neutral if no time data
  const attemptScore = Math.max(0, 100 - (newAvgAttempts * 10)); // Penalize many attempts

  const masteryScore = Math.min(100, Math.max(0,
    successRate * 0.6 + hintScore * 0.2 + timeScore * 0.15 + attemptScore * 0.05
  ));

  const updatedPerf: DifficultyPerformance = {
    ...currentPerf,
    problemsAttempted: newAttempts,
    problemsSolved: newSolved,
    averageAttempts: Math.round(newAvgAttempts * 10) / 10,
    averageTime: Math.round(newAvgTime * 10) / 10,
    averageHints: Math.round(newAvgHints * 10) / 10,
    successRate: Math.round(successRate * 10) / 10,
    masteryScore: Math.round(masteryScore),
    lastAttempted: Date.now(),
  };

  const updatedPerformances = {
    ...data.performances,
    [difficulty]: updatedPerf,
  };

  // Calculate recommended difficulty
  const recommendedDifficulty = calculateRecommendedDifficulty({
    ...data,
    performances: updatedPerformances,
  });

  return {
    ...data,
    performances: updatedPerformances,
    recommendedDifficulty,
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate recommended difficulty based on performance
 */
export function calculateRecommendedDifficulty(
  data: DifficultyTrackingData
): DifficultyLevel {
  if (!data.autoAdjustEnabled) {
    return data.recommendedDifficulty || "middle";
  }

  // Get performance for current recommended difficulty (or default to middle)
  const currentDifficulty = data.recommendedDifficulty || "middle";
  const currentPerf = data.performances[currentDifficulty];

  // Need at least 3 attempts at current difficulty to make a recommendation
  if (currentPerf.problemsAttempted < 3) {
    return currentDifficulty;
  }

  const { successRate, masteryScore, averageHints, averageAttempts } = currentPerf;

  // Criteria for moving up (easier → harder)
  const shouldMoveUp = 
    successRate >= 80 && 
    masteryScore >= 75 && 
    averageHints < 1.5 && 
    averageAttempts < 2.5 &&
    currentDifficulty !== "advanced";

  // Criteria for moving down (harder → easier)
  const shouldMoveDown = 
    (successRate < 50 || masteryScore < 40) && 
    currentDifficulty !== "elementary";

  if (shouldMoveUp) {
    // Move to next difficulty level
    const difficultyOrder: DifficultyLevel[] = ["elementary", "middle", "high", "advanced"];
    const currentIndex = difficultyOrder.indexOf(currentDifficulty);
    if (currentIndex < difficultyOrder.length - 1) {
      return difficultyOrder[currentIndex + 1];
    }
  } else if (shouldMoveDown) {
    // Move to previous difficulty level
    const difficultyOrder: DifficultyLevel[] = ["elementary", "middle", "high", "advanced"];
    const currentIndex = difficultyOrder.indexOf(currentDifficulty);
    if (currentIndex > 0) {
      return difficultyOrder[currentIndex - 1];
    }
  }

  // Stay at current difficulty
  return currentDifficulty;
}

/**
 * Get difficulty recommendation message
 */
export function getDifficultyRecommendationMessage(
  current: DifficultyLevel,
  recommended: DifficultyLevel,
  performance?: DifficultyPerformance
): string {
  if (current === recommended) {
    if (!performance) {
      return "Keep practicing at this level!";
    }
    
    if (performance.successRate >= 80) {
      return "You're doing great! Keep practicing to master this level.";
    } else if (performance.successRate >= 60) {
      return "You're making good progress. Keep going!";
    } else {
      return "Keep practicing. You're improving!";
    }
  }

  if (recommended === "elementary") {
    return "Let's try some easier problems to build confidence.";
  } else if (recommended === "middle") {
    return current === "elementary"
      ? "Ready for middle school level? Let's try it!"
      : "Let's practice at middle school level to strengthen your skills.";
  } else if (recommended === "high") {
    return "You're ready for high school level challenges!";
  } else {
    return "You're excelling! Ready for advanced problems?";
  }
}

/**
 * Get difficulty statistics summary
 */
export function getDifficultyStats(data: DifficultyTrackingData): {
  totalAttempts: number;
  totalSolved: number;
  overallSuccessRate: number;
  mostPracticed: DifficultyLevel;
  bestPerformance: DifficultyLevel;
} {
  let totalAttempts = 0;
  let totalSolved = 0;
  let bestSuccessRate = -1;
  let mostAttempts = 0;
  let bestDifficulty: DifficultyLevel = "middle";
  let mostPracticed: DifficultyLevel = "middle";

  Object.entries(data.performances).forEach(([difficulty, perf]) => {
    totalAttempts += perf.problemsAttempted;
    totalSolved += perf.problemsSolved;
    
    if (perf.problemsAttempted > mostAttempts) {
      mostAttempts = perf.problemsAttempted;
      mostPracticed = difficulty as DifficultyLevel;
    }
    
    if (perf.problemsAttempted >= 3 && perf.successRate > bestSuccessRate) {
      bestSuccessRate = perf.successRate;
      bestDifficulty = difficulty as DifficultyLevel;
    }
  });

  return {
    totalAttempts,
    totalSolved,
    overallSuccessRate: totalAttempts > 0 ? Math.round((totalSolved / totalAttempts) * 100) : 0,
    mostPracticed,
    bestPerformance: bestDifficulty,
  };
}

