"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ProblemType } from "@/types";
import { getAllConcepts, getConceptsByCategory, getConceptsNeedingPractice, ConceptTrackingData } from "@/services/conceptTracker";
import ProgressVisualization from "../ProgressVisualization";
import DifficultyRecommendation from "../DifficultyRecommendation";
import { DifficultyLevel } from "@/services/difficultyTracker";

interface ProblemStats {
  totalProblems: number;
  problemsByType: Record<string, number>;
  totalTime: number; // in minutes
  averageExchanges: number;
  problemsSolved: number;
  // Advanced analytics
  dailyActivity: Record<string, number>; // date -> count
  weeklyActivity: number[]; // 7 days of week
  problemsByDifficulty: Record<string, number>;
  hintsUsage: { total: number; average: number };
  efficiencyScore: number; // 0-100
  improvementTrend: "improving" | "stable" | "declining";
  timeDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
}

interface SavedProblem {
  id: string;
  text: string;
  type: ProblemType;
  savedAt: number;
  difficulty?: string;
  hintsUsed?: number;
  exchanges?: number;
}

interface XPData {
  totalXP: number;
  level: number;
  xpHistory: Array<{ date: string; xp: number; reason: string }>;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: number;
}

/**
 * Dashboard Content - Learning analytics and statistics
 */
interface DashboardContentProps {
  onDifficultyChange?: (difficulty: DifficultyLevel) => void;
}

export default function DashboardContent({ onDifficultyChange }: DashboardContentProps = {}) {
  const [savedProblems] = useLocalStorage<SavedProblem[]>("aitutor-problem-history", []);
  const [xpData] = useLocalStorage<XPData>("aitutor-xp", { totalXP: 0, level: 1, xpHistory: [] });
  const [streakData] = useLocalStorage<StreakData>("aitutor-streak", { currentStreak: 0, longestStreak: 0, lastStudyDate: 0 });
  const [conceptData] = useLocalStorage<ConceptTrackingData>("aitutor-concepts", { concepts: {}, lastUpdated: Date.now() });
  const [stats, setStats] = useState<ProblemStats | null>(null);

  useEffect(() => {
    if (savedProblems.length === 0) {
      setStats(null);
      return;
    }

    // Calculate statistics
    const problemsByType: Record<string, number> = {};
    const problemsByDifficulty: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};
    const weeklyActivity = [0, 0, 0, 0, 0, 0, 0]; // Sunday to Saturday
    const timeDistribution = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    let totalTime = 0;
    let totalExchanges = 0;
    let totalHints = 0;
    let problemsSolved = 0;

    // Sort by date to calculate trends
    const sortedProblems = [...savedProblems].sort((a, b) => a.savedAt - b.savedAt);

    sortedProblems.forEach((problem) => {
      // Count by type
      const type = problem.type || "UNKNOWN";
      problemsByType[type] = (problemsByType[type] || 0) + 1;

      // Count by difficulty
      const difficulty = problem.difficulty || "medium";
      problemsByDifficulty[difficulty] = (problemsByDifficulty[difficulty] || 0) + 1;

      // Daily activity
      const date = new Date(problem.savedAt);
      const dateKey = date.toISOString().split("T")[0];
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;

      // Weekly activity (0 = Sunday, 6 = Saturday)
      const dayOfWeek = date.getDay();
      weeklyActivity[dayOfWeek]++;

      // Time distribution
      const hour = date.getHours();
      if (hour >= 6 && hour < 12) timeDistribution.morning++;
      else if (hour >= 12 && hour < 17) timeDistribution.afternoon++;
      else if (hour >= 17 && hour < 22) timeDistribution.evening++;
      else timeDistribution.night++;

      // Estimate time (rough estimate: 5 minutes per problem)
      totalTime += 5;
      totalExchanges += problem.exchanges || 5;
      totalHints += problem.hintsUsed || 0;
      problemsSolved++;
    });

    // Calculate efficiency score (0-100)
    // Higher score = fewer hints, fewer exchanges, faster solving
    const avgExchanges = totalExchanges / Math.max(1, problemsSolved);
    const avgHints = totalHints / Math.max(1, problemsSolved);
    const efficiencyScore = Math.max(0, Math.min(100, 
      100 - (avgExchanges * 5) - (avgHints * 10)
    ));

    // Calculate improvement trend
    const recentProblems = sortedProblems.slice(-10);
    const olderProblems = sortedProblems.slice(0, Math.min(10, sortedProblems.length - 10));
    
    let improvementTrend: "improving" | "stable" | "declining" = "stable";
    if (recentProblems.length > 0 && olderProblems.length > 0) {
      const recentAvgHints = recentProblems.reduce((sum, p) => sum + (p.hintsUsed || 0), 0) / recentProblems.length;
      const olderAvgHints = olderProblems.reduce((sum, p) => sum + (p.hintsUsed || 0), 0) / olderProblems.length;
      
      if (recentAvgHints < olderAvgHints * 0.8) improvementTrend = "improving";
      else if (recentAvgHints > olderAvgHints * 1.2) improvementTrend = "declining";
    }

    setStats({
      totalProblems: savedProblems.length,
      problemsByType,
      problemsByDifficulty,
      totalTime,
      averageExchanges: totalExchanges / Math.max(1, problemsSolved),
      problemsSolved,
      dailyActivity,
      weeklyActivity,
      hintsUsage: {
        total: totalHints,
        average: totalHints / Math.max(1, problemsSolved),
      },
      efficiencyScore,
      improvementTrend,
      timeDistribution,
    });
  }, [savedProblems]);

  const typeLabels: Record<string, string> = {
    ARITHMETIC: "Arithmetic",
    ALGEBRA: "Algebra",
    GEOMETRY: "Geometry",
    WORD_PROBLEM: "Word Problems",
    MULTI_STEP: "Multi-Step",
    UNKNOWN: "Other",
  };

  if (!stats || stats.totalProblems === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        <p className="text-sm transition-colors">No learning data yet</p>
        <p className="text-xs mt-1 transition-colors">Start solving problems to see your progress</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg transition-colors">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 transition-colors">Problems Solved</p>
          <p className="text-2xl font-light text-blue-900 dark:text-blue-100 transition-colors">{stats.problemsSolved}</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg transition-colors">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1 transition-colors">Time Spent</p>
          <p className="text-2xl font-light text-green-900 dark:text-green-100 transition-colors">{stats.totalTime} min</p>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg transition-colors">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1 transition-colors">Level</p>
          <p className="text-2xl font-light text-purple-900 dark:text-purple-100 transition-colors">{xpData.level}</p>
          <p className="text-xs text-purple-500 dark:text-purple-400 transition-colors">{xpData.totalXP.toLocaleString()} XP</p>
        </div>
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg transition-colors">
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1 transition-colors">Streak</p>
          <p className="text-2xl font-light text-orange-900 dark:text-orange-100 transition-colors">{streakData.currentStreak} days</p>
          <p className="text-xs text-orange-500 dark:text-orange-400 transition-colors">Best: {streakData.longestStreak}</p>
        </div>
      </div>

      {/* Efficiency Score */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 transition-colors">Efficiency Score</p>
          <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100 transition-colors">{Math.round(stats.efficiencyScore)}/100</p>
        </div>
        <div className="w-full h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden transition-colors">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${stats.efficiencyScore}%` }}
          />
        </div>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 transition-colors">
          {stats.improvementTrend === "improving" && "📈 Improving! Keep it up!"}
          {stats.improvementTrend === "stable" && "➡️ Stable performance"}
          {stats.improvementTrend === "declining" && "📉 Try using fewer hints"}
        </p>
      </div>

      {/* Hints Usage */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Hints Usage</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
              Total: {stats.hintsUsage.total} | Avg: {stats.hintsUsage.average.toFixed(1)} per problem
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-500 transition-colors">Efficiency</p>
            <p className={`text-lg font-bold transition-colors ${
              stats.hintsUsage.average < 2 ? "text-green-600 dark:text-green-400" :
              stats.hintsUsage.average < 4 ? "text-yellow-600 dark:text-yellow-400" :
              "text-red-600 dark:text-red-400"
            }`}>
              {stats.hintsUsage.average < 2 ? "Excellent" :
               stats.hintsUsage.average < 4 ? "Good" : "Needs Work"}
            </p>
          </div>
        </div>
      </div>

      {/* Concept Mastery */}
      {(() => {
        const concepts = getAllConcepts(conceptData);
        const conceptsNeedingPractice = getConceptsNeedingPractice(conceptData, 70);
        const conceptsByCategory = getConceptsByCategory(conceptData);

        if (concepts.length === 0) {
          return null; // Don't show if no concepts tracked yet
        }

        return (
          <div>
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide transition-colors">
              Concept Mastery
            </h4>
            
            {/* Concepts Needing Practice */}
            {conceptsNeedingPractice.length > 0 && (
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-2 transition-colors">
                  💪 Practice These:
                </p>
                <div className="space-y-1.5">
                  {conceptsNeedingPractice.slice(0, 5).map((concept) => (
                    <div key={concept.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate transition-colors">
                        {concept.name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 rounded-full transition-all"
                            style={{ width: `${concept.masteryLevel}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right transition-colors">
                          {concept.masteryLevel}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Concepts by Category */}
            <div className="space-y-3">
              {Object.entries(conceptsByCategory).map(([category, categoryConcepts]) => (
                <div key={category} className="space-y-1.5">
                  <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide transition-colors">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h5>
                  {categoryConcepts.slice(0, 3).map((concept) => (
                    <div key={concept.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 min-w-0 truncate transition-colors">
                        {concept.name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
                          <div
                            className={`h-full rounded-full transition-all ${
                              concept.masteryLevel >= 80
                                ? "bg-gradient-to-r from-green-400 to-green-600 dark:from-green-500 dark:to-green-700"
                                : concept.masteryLevel >= 60
                                ? "bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700"
                                : "bg-gradient-to-r from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-700"
                            }`}
                            style={{ width: `${concept.masteryLevel}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right transition-colors">
                          {concept.masteryLevel}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {categoryConcepts.length > 3 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors">
                      +{categoryConcepts.length - 3} more
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Progress Visualization */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide transition-colors">
          Visual Progress
        </h4>
        <ProgressVisualization view="all" />
      </div>

      {/* Problems by Type */}
      <div>
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide transition-colors">
          Problems by Type
        </h4>
        <div className="space-y-2">
          {Object.entries(stats.problemsByType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div key={type} className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors flex-1 min-w-0 truncate">
                  {typeLabels[type] || type}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
                    <div
                      className="h-full bg-gray-900 dark:bg-gray-600 rounded-full transition-all"
                      style={{
                        width: `${(count / stats.totalProblems) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right transition-colors">{count}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Weekly Activity Chart */}
      {stats.weeklyActivity.some(count => count > 0) && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide transition-colors">
            Weekly Activity
          </h4>
          <div className="flex items-end gap-1.5 h-28">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
              const maxCount = Math.max(...stats.weeklyActivity, 1);
              const height = maxCount > 0 ? (stats.weeklyActivity[index] / maxCount) * 100 : 0;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex items-end justify-center px-0.5" style={{ height: "80px" }}>
                    <div
                      className="w-full max-w-full bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 rounded-t transition-all"
                      style={{ 
                        height: `${height}%`, 
                        minHeight: stats.weeklyActivity[index] > 0 ? "4px" : "0",
                        maxWidth: "100%"
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors truncate w-full text-center">{day}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors">{stats.weeklyActivity[index]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Distribution */}
      {Object.values(stats.timeDistribution).some(count => count > 0) && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide transition-colors">
            Study Time Preferences
          </h4>
          <div className="space-y-2">
            {[
              { key: "morning", label: "🌅 Morning", time: "6am-12pm", color: "from-yellow-400 to-orange-400" },
              { key: "afternoon", label: "☀️ Afternoon", time: "12pm-5pm", color: "from-blue-400 to-cyan-400" },
              { key: "evening", label: "🌆 Evening", time: "5pm-10pm", color: "from-purple-400 to-pink-400" },
              { key: "night", label: "🌙 Night", time: "10pm-6am", color: "from-indigo-400 to-blue-400" },
            ].map(({ key, label, time, color }) => {
              const count = stats.timeDistribution[key as keyof typeof stats.timeDistribution];
              const maxCount = Math.max(...Object.values(stats.timeDistribution), 1);
              const percentage = (count / maxCount) * 100;
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-600 dark:text-gray-300 transition-colors block truncate">{label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">{time}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
                      <div
                        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right transition-colors">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Problems by Difficulty */}
      {Object.keys(stats.problemsByDifficulty).length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide transition-colors">
            Problems by Difficulty
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.problemsByDifficulty)
              .sort(([, a], [, b]) => b - a)
              .map(([difficulty, count]) => (
                <div key={difficulty} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 capitalize transition-colors flex-1 min-w-0 truncate">
                    {difficulty}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
                      <div
                        className={`h-full rounded-full transition-all ${
                          difficulty === "easy" ? "bg-green-500 dark:bg-green-600" :
                          difficulty === "medium" ? "bg-yellow-500 dark:bg-yellow-600" :
                          "bg-red-500 dark:bg-red-600"
                        }`}
                        style={{
                          width: `${(count / stats.totalProblems) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right transition-colors">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Advanced Insights */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide transition-colors">
          Advanced Insights
        </h4>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 transition-colors">
          {Object.entries(stats.problemsByType).length > 0 && (
            <p>
              You&apos;ve practiced{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100 transition-colors">
                {Object.keys(stats.problemsByType).length} different types
              </span>{" "}
              of problems across{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100 transition-colors">
                {Object.keys(stats.dailyActivity).length} days
              </span>
              .
            </p>
          )}
          {Object.entries(stats.problemsByType).length > 0 && (
            <p>
              Most practiced:{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100 transition-colors">
                {typeLabels[
                  Object.entries(stats.problemsByType).sort(
                    ([, a], [, b]) => b - a
                  )[0][0]
                ] || "Unknown"}
              </span>
            </p>
          )}
          {stats.totalProblems >= 5 && (
            <p>
              Average time per problem:{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100 transition-colors">
                {Math.round(stats.totalTime / stats.totalProblems)} minutes
              </span>
              {" "}• Average exchanges:{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100 transition-colors">
                {stats.averageExchanges.toFixed(1)}
              </span>
            </p>
          )}
          {stats.hintsUsage.average > 0 && (
            <p>
              You use{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100 transition-colors">
                {stats.hintsUsage.average.toFixed(1)} hints
              </span>{" "}
              on average per problem.
            </p>
          )}
          {Object.keys(stats.problemsByType).length < 3 && (
            <p className="text-blue-600 dark:text-blue-400 font-medium transition-colors">
              💡 Try practicing different problem types for a well-rounded learning experience!
            </p>
          )}
          {stats.improvementTrend === "improving" && (
            <p className="text-green-600 dark:text-green-400 font-medium transition-colors">
              🎉 Great progress! You&apos;re solving problems more efficiently!
            </p>
          )}
        </div>
      </div>

      {/* Difficulty Recommendation */}
      <div className="mt-6">
        <DifficultyRecommendation
          currentDifficulty={undefined} // Will read from tracking data
          onDifficultyChange={onDifficultyChange}
        />
      </div>
    </div>
  );
}

