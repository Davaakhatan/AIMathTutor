/**
 * Ranking and Badge Service
 * Provides rank titles and badges based on user level
 */

export interface RankInfo {
  title: string;
  badge: string;
  color: string;
  minLevel: number;
  maxLevel: number;
  description: string;
}

/**
 * Ranking system based on levels
 */
export const RANKS: RankInfo[] = [
  {
    title: "Novice",
    badge: "I",
    color: "#94a3b8", // gray
    minLevel: 1,
    maxLevel: 2,
    description: "Just starting the journey",
  },
  {
    title: "Apprentice",
    badge: "II",
    color: "#60a5fa", // blue
    minLevel: 3,
    maxLevel: 5,
    description: "Learning the basics",
  },
  {
    title: "Scholar",
    badge: "III",
    color: "#34d399", // green
    minLevel: 6,
    maxLevel: 9,
    description: "Building strong foundations",
  },
  {
    title: "Expert",
    badge: "IV",
    color: "#fbbf24", // yellow
    minLevel: 10,
    maxLevel: 14,
    description: "Mastering the concepts",
  },
  {
    title: "Master",
    badge: "V",
    color: "#f59e0b", // orange
    minLevel: 15,
    maxLevel: 19,
    description: "Exceptional problem solver",
  },
  {
    title: "Grandmaster",
    badge: "VI",
    color: "#8b5cf6", // purple
    minLevel: 20,
    maxLevel: 29,
    description: "Elite mathematician",
  },
  {
    title: "Legend",
    badge: "VII",
    color: "#ec4899", // pink
    minLevel: 30,
    maxLevel: 49,
    description: "Legendary status achieved",
  },
  {
    title: "Mythical",
    badge: "VIII",
    color: "#06b6d4", // cyan
    minLevel: 50,
    maxLevel: 99,
    description: "Among the greatest",
  },
  {
    title: "Immortal",
    badge: "IX",
    color: "#d946ef", // fuchsia
    minLevel: 100,
    maxLevel: Infinity,
    description: "Transcended all limits",
  },
];

/**
 * Get rank info for a given level
 */
export function getRankForLevel(level: number): RankInfo {
  const rank = RANKS.find(
    (r) => level >= r.minLevel && level <= r.maxLevel
  );
  
  return rank || RANKS[0]; // Default to Novice if not found
}

/**
 * Get next rank info
 */
export function getNextRank(currentLevel: number): RankInfo | null {
  const currentRank = getRankForLevel(currentLevel);
  const currentRankIndex = RANKS.findIndex((r) => r.title === currentRank.title);
  
  if (currentRankIndex < RANKS.length - 1) {
    return RANKS[currentRankIndex + 1];
  }
  
  return null; // Already at max rank
}

/**
 * Get progress to next rank (0-100)
 */
export function getProgressToNextRank(currentLevel: number): number {
  const currentRank = getRankForLevel(currentLevel);
  const nextRank = getNextRank(currentLevel);
  
  if (!nextRank) {
    return 100; // Already at max rank
  }
  
  // Calculate progress within current rank
  const levelsInRank = currentRank.maxLevel - currentRank.minLevel + 1;
  const currentLevelInRank = currentLevel - currentRank.minLevel;
  
  return Math.round((currentLevelInRank / levelsInRank) * 100);
}

/**
 * Get levels needed for next rank
 */
export function getLevelsToNextRank(currentLevel: number): number {
  const nextRank = getNextRank(currentLevel);
  
  if (!nextRank) {
    return 0; // Already at max rank
  }
  
  return nextRank.minLevel - currentLevel;
}

/**
 * Get all ranks (for display in achievements or info pages)
 */
export function getAllRanks(): RankInfo[] {
  return RANKS;
}

/**
 * Check if user just ranked up
 * Call this after XP update to detect rank changes
 */
export function didRankUp(oldLevel: number, newLevel: number): boolean {
  const oldRank = getRankForLevel(oldLevel);
  const newRank = getRankForLevel(newLevel);
  
  return oldRank.title !== newRank.title;
}

/**
 * Get rank up message
 */
export function getRankUpMessage(newLevel: number): string {
  const rank = getRankForLevel(newLevel);
  return `Rank Up! You are now a ${rank.title} [${rank.badge}]!`;
}

