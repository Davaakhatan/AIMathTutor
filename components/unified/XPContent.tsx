"use client";

import { useEffect, useState, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

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

interface XPContentProps {
  onXPDataChange?: (data: { totalXP: number; level: number; problemsSolved: number }) => void;
}

/**
 * XP Content - Just the XP display (no badge wrapper)
 */
export default function XPContent({ onXPDataChange }: XPContentProps) {
  const [xpData, setXPData] = useLocalStorage<XPData>("aitutor-xp", {
    totalXP: 0,
    level: 1,
    xpToNextLevel: 100,
    xpHistory: [],
    recentGains: [],
  });

  // Calculate XP needed for next level
  const calculateXPForLevel = (level: number): number => {
    return Math.round(100 * (level - 1) * 1.5 + 100);
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

  // Update XP to next level (use ref to prevent infinite loop)
  const prevXPDataRef = useRef({ totalXP: xpData.totalXP, level: xpData.level });
  
  useEffect(() => {
    // Only update if totalXP or level actually changed
    if (prevXPDataRef.current.totalXP !== xpData.totalXP || 
        prevXPDataRef.current.level !== xpData.level) {
      const xpToNext = calculateXPToNext(xpData.totalXP, xpData.level);
      if (xpToNext !== xpData.xpToNextLevel) {
        setXPData((prev) => ({ ...prev, xpToNextLevel: xpToNext }));
      }
      prevXPDataRef.current = { totalXP: xpData.totalXP, level: xpData.level };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xpData.totalXP, xpData.level, xpData.xpToNextLevel]); // calculateXPToNext and setXPData are stable functions

  const progressPercentage = xpData.xpToNextLevel > 0
    ? ((calculateXPForLevel(xpData.level) - xpData.xpToNextLevel) / calculateXPForLevel(xpData.level)) * 100
    : 100;

  const problemsSolved = xpData.xpHistory.filter(h => h.reason.includes("Problem solved") || h.reason.includes("Solved")).length;

  // Notify parent (memoize to prevent infinite loops)
  const prevNotificationRef = useRef({ totalXP: 0, level: 1, problemsSolved: 0 });
  
  useEffect(() => {
    const currentData = {
      totalXP: xpData.totalXP,
      level: xpData.level,
      problemsSolved,
    };
    
    // Only notify if data actually changed
    if (
      prevNotificationRef.current.totalXP !== currentData.totalXP ||
      prevNotificationRef.current.level !== currentData.level ||
      prevNotificationRef.current.problemsSolved !== currentData.problemsSolved
    ) {
      if (onXPDataChange) {
        onXPDataChange(currentData);
      }
      prevNotificationRef.current = currentData;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xpData.totalXP, xpData.level, problemsSolved]); // Don't include onXPDataChange to prevent loops

  return (
    <div className="p-4 space-y-4">
      {/* Current Level Display */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">⭐</span>
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Level {xpData.level}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {xpData.totalXP.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress to Level {xpData.level + 1}</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {xpData.xpToNextLevel} XP needed for next level
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Problems Solved</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{problemsSolved}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total XP</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{xpData.totalXP.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent XP Gains */}
      {xpData.recentGains && xpData.recentGains.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Recent XP Gains</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {xpData.recentGains.slice(0, 5).map((gain, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">+{gain.xp} XP</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{gain.reason}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(gain.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

