"use client";

import { useEffect, useState, useRef } from "react";
import { useXPData } from "@/hooks/useXPData";
import { useAuth } from "@/contexts/AuthContext";
import { getRankForLevel, getNextRank, getLevelsToNextRank } from "@/services/rankingService";

interface XPContentProps {
  onXPDataChange?: (data: { totalXP: number; level: number; problemsSolved: number }) => void;
}

/**
 * XP Content - Just the XP display (no badge wrapper)
 */
export default function XPContent({ onXPDataChange }: XPContentProps) {
  const { xpData, updateXP, isLoading } = useXPData();
  const { user } = useAuth();
  
  // Debug: Log XP data whenever it changes
  useEffect(() => {
    console.log("[XPContent] XP data updated:", {
      totalXP: xpData.totalXP,
      level: xpData.level,
      isLoading,
      userId: user?.id
    });
  }, [xpData.totalXP, xpData.level, isLoading, user?.id]);
  
  // Manual sync: Always sync once on mount to ensure we have latest data from database
  // This fixes cases where localStorage has stale data
  useEffect(() => {
    if (!user || isLoading) return;
    
    // Use a ref to track if we've synced to avoid multiple syncs
    const syncXP = async () => {
      try {
        const currentXP = xpData.totalXP; // Capture current value
        console.log("[XPContent] Syncing XP from API to check for updates...", { userId: user.id, currentXP });
        const response = await fetch(`/api/xp/sync?userId=${user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.xpData) {
            const dbXP = result.xpData.totalXP;
            
            // Update if database has different XP (database is source of truth)
            if (dbXP !== currentXP) {
              console.log("[XPContent] XP mismatch detected! Updating from", currentXP, "to", dbXP);
              // Update localStorage directly - this will be picked up by the hook
              localStorage.setItem("aitutor-xp", JSON.stringify(result.xpData));
              
              // Dispatch custom event to notify the hook
              window.dispatchEvent(new CustomEvent('xp-sync-complete', {
                detail: result.xpData
              }));
              
              // Also try to call updateXP (in case xpData exists)
              // The hook's updateXP expects XPData format (with underscores)
              updateXP({
                total_xp: result.xpData.totalXP,
                level: result.xpData.level,
                xp_to_next_level: result.xpData.xpToNextLevel,
                xp_history: result.xpData.xpHistory || [],
                recent_gains: result.xpData.recentGains || [],
              }).catch((error) => {
                // If updateXP fails, that's okay - the event listener will handle it
                console.log("[XPContent] updateXP failed, but event dispatched - hook will sync", { error });
              });
            } else {
              console.log("[XPContent] XP matches database, no update needed", { currentXP, dbXP });
            }
          }
        }
      } catch (error) {
        console.error("[XPContent] Manual sync failed:", error);
      }
    };
    
    // Sync once on mount with a short delay to avoid race conditions
    // Only sync if we have a user and data is loaded
    const timeoutId = setTimeout(syncXP, 1500);
    return () => clearTimeout(timeoutId);
  }, [user?.id, isLoading]); // Sync when user changes or loading completes

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

  // Calculate XP to next level (don't update database - just display)
  // This was causing infinite loops by calling updateXP() on every render
  const xpToNextLevel = calculateXPToNext(xpData.totalXP, xpData.level);

  const progressPercentage = xpToNextLevel > 0
    ? ((calculateXPForLevel(xpData.level) - xpToNextLevel) / calculateXPForLevel(xpData.level)) * 100
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

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const currentRank = getRankForLevel(xpData.level);
  const nextRank = getNextRank(xpData.level);
  const levelsToNextRank = getLevelsToNextRank(xpData.level);

  return (
    <div className="p-6 space-y-6">
      {/* Rank & Level Card */}
      <div 
        className="relative overflow-hidden rounded-xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl"
        style={{ 
          background: `linear-gradient(135deg, ${currentRank.color}08, ${currentRank.color}15)`,
          borderColor: `${currentRank.color}40`
        }}
      >
        {/* Decorative background pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${currentRank.color} 0, ${currentRank.color} 2px, transparent 2px, transparent 10px)`,
          }}
        />
        
        {/* Content */}
        <div className="relative">
          <div className="flex items-start gap-4 mb-4">
            {/* Rank Badge */}
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-white text-2xl shadow-md transform transition-transform hover:scale-110"
              style={{ 
                background: `linear-gradient(135deg, ${currentRank.color}, ${currentRank.color}cc)`,
              }}
            >
              {currentRank.badge}
            </div>
            
            {/* Level & Rank Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Level {xpData.level}
                </h3>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold shadow-sm"
                  style={{ 
                    backgroundColor: `${currentRank.color}25`,
                    color: currentRank.color,
                    border: `1px solid ${currentRank.color}40`
                  }}
                >
                  {currentRank.title}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentRank.description}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {xpData.totalXP.toLocaleString()} XP
                </span>
                {nextRank && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {levelsToNextRank} level{levelsToNextRank !== 1 ? 's' : ''} to{' '}
                      <span style={{ color: nextRank.color }} className="font-semibold">
                        {nextRank.title}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-gray-700 dark:text-gray-300">
                Level {xpData.level} → {xpData.level + 1}
              </span>
              <span 
                className="font-bold"
                style={{ color: currentRank.color }}
              >
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="relative">
              <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full transition-all duration-700 ease-out relative"
                  style={{ 
                    width: `${progressPercentage}%`,
                    background: `linear-gradient(90deg, ${currentRank.color}, ${currentRank.color}dd)`
                  }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" />
                </div>
              </div>
              {/* XP needed label */}
              <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                {xpData.xpToNextLevel.toLocaleString()} XP needed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">✓</span>
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Problems Solved</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{problemsSolved}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">★</span>
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total XP</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{xpData.totalXP.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent XP Gains */}
      {xpData.recentGains && xpData.recentGains.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
            Recent Activity
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
            {xpData.recentGains.slice(0, 5).map((gain, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 font-bold text-xs">+{gain.xp}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{gain.reason}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(gain.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

