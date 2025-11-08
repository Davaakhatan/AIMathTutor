"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getLeaderboardData } from "@/services/leaderboardService";
import type { LeaderboardEntry } from "@/services/leaderboardService";
import { logger } from "@/lib/logger";

interface LeaderboardContentProps {
  currentXP: number;
  currentLevel: number;
  currentProblemsSolved: number;
  currentStreak: number;
}

/**
 * Leaderboard Content - Shows top performers from database
 */
export default function LeaderboardContent({
  currentXP,
  currentLevel,
  currentProblemsSolved,
  currentStreak,
}: LeaderboardContentProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch leaderboard from database
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        logger.debug("Fetching leaderboard data from database", { userId: user.id });
        
        const data = await getLeaderboardData(user.id, 100);
        
        setLeaderboard(data.topPlayers);
        setUserEntry(data.userEntry);
        setUserRank(data.userRank);
        
        logger.info("Leaderboard loaded", { 
          topPlayersCount: data.topPlayers.length,
          userRank: data.userRank
        });
      } catch (error) {
        logger.error("Error fetching leaderboard", { error });
        // Keep empty state
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
    
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  const topPlayers = leaderboard.slice(0, 10);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* User's Rank Card */}
      {userRank && userEntry && (
        <div 
          className="relative overflow-hidden rounded-xl p-5 shadow-lg border-2 transition-all duration-300 hover:shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${userEntry.rankColor}10, ${userEntry.rankColor}20)`,
            borderColor: `${userEntry.rankColor}60`
          }}
        >
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Rank Badge */}
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md"
                style={{ 
                  background: `linear-gradient(135deg, ${userEntry.rankColor}, ${userEntry.rankColor}dd)`,
                }}
              >
                {userEntry.rankBadge}
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Your Rank
                  </p>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    #{userRank}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                    style={{ 
                      backgroundColor: `${userEntry.rankColor}30`,
                      color: userEntry.rankColor
                    }}
                  >
                    {userEntry.rank}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {userEntry.username}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {userEntry.totalXP.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">XP</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Players Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-yellow-500 to-orange-500" />
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Top Players
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            Updates every 30s
          </span>
        </div>
        
        <div className="space-y-3">
          {topPlayers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-gray-400">?</span>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                No players yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Be the first to solve problems and earn XP!
              </p>
            </div>
          ) : (
            topPlayers.map((player, index) => {
              const isCurrentUser = player.userId === userEntry?.userId;
              const position = index + 1;
              
              return (
                <div
                  key={player.userId}
                  className={`relative overflow-hidden rounded-xl p-4 border shadow-sm transition-all duration-200 hover:shadow-md ${
                    isCurrentUser
                      ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-300 dark:border-indigo-600"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Position Badge */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      position === 1 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md" :
                      position === 2 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md" :
                      position === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md" :
                      "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                      {position}
                    </div>
                    
                    {/* Rank Badge */}
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-sm"
                      style={{ 
                        background: `linear-gradient(135deg, ${player.rankColor}, ${player.rankColor}cc)`,
                      }}
                    >
                      {player.rankBadge}
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-semibold truncate ${
                          isCurrentUser
                            ? "text-indigo-900 dark:text-indigo-100"
                            : "text-gray-900 dark:text-gray-100"
                        }`}>
                          {player.username || player.displayName || "Anonymous"}
                          {isCurrentUser && " (You)"}
                        </p>
                        <span 
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold shrink-0"
                          style={{ 
                            backgroundColor: `${player.rankColor}25`,
                            color: player.rankColor
                          }}
                        >
                          {player.rank}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Lv.{player.level}</span>
                        <span>•</span>
                        <span>{player.problemsSolved} solved</span>
                        <span>•</span>
                        <span>{player.currentStreak} day streak</span>
                      </div>
                    </div>
                    
                    {/* XP Display */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {player.totalXP.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">XP</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">i</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Real-Time Leaderboard
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Showing top 100 players ranked by total XP. Compete with other learners and climb the ranks!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

