"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ParsedProblem, Message, ProblemType } from "@/types";

interface XPData {
  totalXP: number;
  level: number;
  xpToNextLevel: number;
  xpHistory: Array<{
    date: string;
    xp: number;
    reason: string;
  }>;
  recentGains: Array<{
    timestamp: number;
    xp: number;
    reason: string;
  }>;
}

interface XPSystemProps {
  messages: Message[];
  problem: ParsedProblem | null;
  onLevelUp?: (newLevel: number) => void;
}

/**
 * XP and Leveling System
 * Awards XP for:
 * - Solving problems (base XP)
 * - Number of exchanges (efficiency bonus)
 * - Hints used (penalty reduction)
 * - Daily practice (streak bonus)
 * - Problem difficulty (higher difficulty = more XP)
 */
export default function XPSystem({ 
  messages, 
  problem,
  onLevelUp 
}: XPSystemProps) {
  const [xpData, setXPData] = useLocalStorage<XPData>("aitutor-xp", {
    totalXP: 0,
    level: 1,
    xpToNextLevel: 100,
    xpHistory: [],
    recentGains: [],
  });

  const [showXPNotification, setShowXPNotification] = useState(false);
  const [lastXPNotification, setLastXPNotification] = useState<{ xp: number; reason: string } | null>(null);
  const [previousProblemId, setPreviousProblemId] = useState<string | null>(null);
  const [previousLevel, setPreviousLevel] = useState(xpData.level);
  const [isMounted, setIsMounted] = useState(false);

  // Calculate XP needed for next level (exponential curve)
  const calculateXPForLevel = (level: number): number => {
    // Level 1: 100, Level 2: 200, Level 3: 350, Level 4: 550, etc.
    // Formula: base * (level - 1) * 1.5 + base
    return Math.round(100 * (level - 1) * 1.5 + 100);
  };

  // Calculate level from total XP
  const calculateLevel = (totalXP: number): number => {
    let level = 1;
    let xpNeeded = 0;
    
    while (xpNeeded <= totalXP) {
      xpNeeded += calculateXPForLevel(level);
      if (xpNeeded <= totalXP) {
        level++;
      }
    }
    
    return level;
  };

  // Calculate XP to next level
  const calculateXPToNext = (totalXP: number, level: number): number => {
    let xpForThisLevel = 0;
    for (let i = 1; i < level; i++) {
      xpForThisLevel += calculateXPForLevel(i);
    }
    const xpForNextLevel = calculateXPForLevel(level);
    const xpInCurrentLevel = totalXP - xpForThisLevel;
    return Math.max(0, xpForNextLevel - xpInCurrentLevel);
  };

  // Award XP when problem is solved
  useEffect(() => {
    if (!problem || !messages.length) return;

    const problemId = `${problem.text}-${problem.type}`;
    
    // Only process once per problem
    if (problemId === previousProblemId) return;

    // Check if problem is solved (look for completion indicators)
    const tutorMessages = messages.filter(m => m.role === "tutor");
    const isSolved = tutorMessages.some(msg => {
      const content = msg.content.toLowerCase();
      const completionPhrases = [
        "you've solved it",
        "you solved it",
        "solution is correct",
        "answer is correct",
        "congratulations!",
        "well done! you solved",
        "excellent! you solved",
        "perfect! you solved",
      ];
      return completionPhrases.some(phrase => content.includes(phrase));
    });

    if (!isSolved) return;

    // Calculate XP award
    const userMessages = messages.filter(m => m.role === "user");
    const tutorMessagesCount = tutorMessages.length;
    const exchanges = Math.min(userMessages.length, tutorMessagesCount);

    // Count hints used
    const hintsUsed = messages.filter(m => 
      m.role === "tutor" && (
        m.content.startsWith("💡 Hint:") ||
        m.content.startsWith("💡") && m.content.toLowerCase().includes("hint")
      )
    ).length;

    // Base XP based on problem type/difficulty
    // Get difficulty from problem type or default to middle school
    let baseXP = 20; // Default middle school
    if (problem.type === ProblemType.ARITHMETIC) baseXP = 10;
    else if (problem.type === ProblemType.ALGEBRA) baseXP = 20;
    else if (problem.type === ProblemType.GEOMETRY) baseXP = 25;
    else if (problem.type === ProblemType.WORD_PROBLEM) baseXP = 30;
    else if (problem.type === ProblemType.MULTI_STEP) baseXP = 40;
    else baseXP = 20; // UNKNOWN type

    // Efficiency bonus: fewer exchanges = more XP
    const efficiencyBonus = Math.max(0, 15 - exchanges);
    
    // Hint penalty: each hint reduces XP slightly
    const hintPenalty = hintsUsed * 2;
    
    // Total XP calculation
    const xpGained = Math.max(5, baseXP + efficiencyBonus - hintPenalty);

    // Update XP data
    const newTotalXP = xpData.totalXP + xpGained;
    const newLevel = calculateLevel(newTotalXP);
    const newXPToNext = calculateXPToNext(newTotalXP, newLevel);

    const today = new Date().toISOString().split("T")[0];
    const todayHistory = xpData.xpHistory.find(h => h.date === today);

    setXPData({
      totalXP: newTotalXP,
      level: newLevel,
      xpToNextLevel: newXPToNext,
      xpHistory: todayHistory
        ? xpData.xpHistory.map(h => 
            h.date === today 
              ? { ...h, xp: h.xp + xpGained, reason: `${h.reason} + Problem solved` }
              : h
          )
        : [...xpData.xpHistory, { date: today, xp: xpGained, reason: "Problem solved" }],
      recentGains: [
        {
          timestamp: Date.now(),
          xp: xpGained,
          reason: `Solved ${problem.type?.replace("_", " ") || "problem"}`,
        },
        ...xpData.recentGains.slice(0, 9), // Keep last 10
      ],
    });

    // Show notification
    setLastXPNotification({
      xp: xpGained,
      reason: `Solved ${problem.type?.replace("_", " ") || "problem"}!`,
    });
    setShowXPNotification(true);
    setPreviousProblemId(problemId);

    // Play success sound
    if (typeof window !== "undefined") {
      import("@/lib/soundEffects").then(({ playSuccess, playXPGain }) => {
        playSuccess();
        setTimeout(() => playXPGain(), 500);
      });
    }

    // Check for level up
    if (newLevel > previousLevel) {
      setTimeout(() => {
        if (onLevelUp) {
          onLevelUp(newLevel);
        }
        // Play level up sound
        if (typeof window !== "undefined") {
          import("@/lib/soundEffects").then(({ playLevelUp }) => {
            playLevelUp();
          });
        }
      }, 2000); // Show after XP notification
    }

    setPreviousLevel(newLevel);

    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setShowXPNotification(false);
    }, 3000);
  }, [messages, problem, xpData, previousProblemId, previousLevel, onLevelUp, setXPData]);

  // Level up celebration
  useEffect(() => {
    if (xpData.level > previousLevel && xpData.level > 1) {
      // Level up will be handled by parent component
    }
  }, [xpData.level, previousLevel]);

  // Award bonus XP for daily practice
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayHistory = xpData.xpHistory.find(h => h.date === today);
    
    // Check if user has studied today (from StudyStreak or problem history)
    try {
      const lastStudy = localStorage.getItem("aitutor-last-study");
      if (lastStudy) {
        const lastStudyDate = new Date(parseInt(lastStudy)).toISOString().split("T")[0];
        if (lastStudyDate === today && !todayHistory) {
          // First problem of the day - give daily bonus
          const dailyBonus = 10;
          const newTotalXP = xpData.totalXP + dailyBonus;
          const newLevel = calculateLevel(newTotalXP);
          const newXPToNext = calculateXPToNext(newTotalXP, newLevel);

          setXPData({
            ...xpData,
            totalXP: newTotalXP,
            level: newLevel,
            xpToNextLevel: newXPToNext,
            xpHistory: [
              ...xpData.xpHistory,
              { date: today, xp: dailyBonus, reason: "Daily practice bonus" },
            ],
            recentGains: [
              { timestamp: Date.now(), xp: dailyBonus, reason: "Daily practice bonus" },
              ...xpData.recentGains.slice(0, 9),
            ],
          });

          setLastXPNotification({
            xp: dailyBonus,
            reason: "Daily practice bonus!",
          });
          setShowXPNotification(true);
          setTimeout(() => setShowXPNotification(false), 3000);
          
          // Play XP gain sound
          if (typeof window !== "undefined") {
            import("@/lib/soundEffects").then(({ playXPGain }) => {
              playXPGain();
            });
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }, []); // Only run once on mount

  // Only render after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const progressPercentage = xpData.xpToNextLevel > 0
    ? ((calculateXPForLevel(xpData.level) - xpData.xpToNextLevel) / calculateXPForLevel(xpData.level)) * 100
    : 100;

  // Don't render until after hydration to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* XP Display Badge - Positioned to not overlap with Settings */}
      <div className="fixed top-4 right-28 z-40">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">⭐</span>
            </div>
            <div className="flex flex-col min-w-[60px]">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 transition-colors">
                  Lv {xpData.level}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                  {xpData.totalXP.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>
          <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* XP Gain Notification */}
      {showXPNotification && lastXPNotification && (
        <div className="fixed top-20 right-1/2 transform translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg shadow-xl px-6 py-3 flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-bold text-lg">+{lastXPNotification.xp} XP</p>
              <p className="text-xs text-yellow-100">{lastXPNotification.reason}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

