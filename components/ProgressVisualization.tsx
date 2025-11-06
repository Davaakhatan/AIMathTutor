"use client";

import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ProblemType } from "@/types";
import {
  getAllConcepts,
  getConceptsByCategory,
  ConceptTrackingData,
  MathConcept,
} from "@/services/conceptTracker";

interface SavedProblem {
  id: string;
  text: string;
  type: ProblemType;
  savedAt: number;
}

interface ProgressVisualizationProps {
  view?: "skill-tree" | "heatmap" | "timeline" | "all";
}

/**
 * Enhanced Progress Visualization Component
 * Shows: Skill tree, Heatmap, Timeline
 */
export default function ProgressVisualization({
  view = "all",
}: ProgressVisualizationProps) {
  const [conceptData] = useLocalStorage<ConceptTrackingData>("aitutor-concepts", {
    concepts: {},
    lastUpdated: Date.now(),
  });
  const [savedProblems] = useLocalStorage<SavedProblem[]>("aitutor-problem-history", []);
  const [activeView, setActiveView] = useState<"skill-tree" | "heatmap" | "timeline">(
    view === "all" ? "skill-tree" : view
  );

  // Calculate timeline data
  const timelineData = useMemo(() => {
    // Filter out problems with invalid dates
    const validProblems = savedProblems.filter(p => {
      if (!p.savedAt || p.savedAt <= 0) return false;
      const testDate = new Date(p.savedAt);
      return !isNaN(testDate.getTime());
    });
    
    const problems = [...validProblems].sort((a, b) => a.savedAt - b.savedAt);
    const timeline: Array<{ date: string; count: number; concepts: string[] }> = [];

    problems.forEach((problem) => {
      // Validate date before using
      const savedAt = problem.savedAt;
      if (!savedAt || savedAt <= 0) return; // Skip if invalid
      
      const date = new Date(savedAt);
      if (isNaN(date.getTime())) return; // Skip if invalid date
      
      const dateKey = date.toISOString().split("T")[0];
      const existing = timeline.find((t) => t.date === dateKey);

      if (existing) {
        existing.count++;
      } else {
        timeline.push({
          date: dateKey,
          count: 1,
          concepts: [],
        });
      }
    });

    return timeline.slice(-30); // Last 30 days
  }, [savedProblems]);

  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    const problemsByType: Record<string, number> = {};
    const problemsByDifficulty: Record<string, number> = {};

    savedProblems.forEach((problem) => {
      const type = problem.type || "UNKNOWN";
      problemsByType[type] = (problemsByType[type] || 0) + 1;
    });

    return {
      byType: problemsByType,
      byDifficulty: problemsByDifficulty,
    };
  }, [savedProblems]);

  return (
    <div className="space-y-4">
      {view === "all" && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <button
            onClick={() => setActiveView("skill-tree")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeView === "skill-tree"
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Skill Tree
          </button>
          <button
            onClick={() => setActiveView("heatmap")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeView === "heatmap"
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Heatmap
          </button>
          <button
            onClick={() => setActiveView("timeline")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeView === "timeline"
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Timeline
          </button>
        </div>
      )}

      {(view === "all" ? activeView === "skill-tree" : view === "skill-tree") && (
        <SkillTreeView concepts={getAllConcepts(conceptData)} />
      )}

      {(view === "all" ? activeView === "heatmap" : view === "heatmap") && (
        <HeatmapView data={heatmapData} />
      )}

      {(view === "all" ? activeView === "timeline" : view === "timeline") && (
        <TimelineView data={timelineData} />
      )}
    </div>
  );
}

/**
 * Skill Tree View - Visual representation of concept mastery
 */
function SkillTreeView({ concepts }: { concepts: MathConcept[] }) {
  const conceptsByCategory = useMemo(() => {
    const byCategory: Record<string, MathConcept[]> = {};
    concepts.forEach((concept) => {
      if (!byCategory[concept.category]) {
        byCategory[concept.category] = [];
      }
      byCategory[concept.category].push(concept);
    });
    return byCategory;
  }, [concepts]);

  if (concepts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        <p className="text-sm">No concepts tracked yet</p>
        <p className="text-xs mt-1">Start solving problems to build your skill tree!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
          Your Math Skill Tree
        </p>
        <p>Each branch represents a category of math concepts you&apos;ve practiced.</p>
      </div>

      <div className="space-y-4">
        {Object.entries(conceptsByCategory).map(([category, categoryConcepts]) => (
          <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({categoryConcepts.length} concepts)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoryConcepts.map((concept) => (
                <div
                  key={concept.id}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {concept.name}
                    </p>
                    <div className="mt-1 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          concept.masteryLevel >= 80
                            ? "bg-gradient-to-r from-green-400 to-green-600"
                            : concept.masteryLevel >= 60
                            ? "bg-gradient-to-r from-blue-400 to-blue-600"
                            : concept.masteryLevel >= 40
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                            : "bg-gradient-to-r from-red-400 to-red-600"
                        }`}
                        style={{ width: `${concept.masteryLevel}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        concept.masteryLevel >= 80
                          ? "text-green-600 dark:text-green-400"
                          : concept.masteryLevel >= 60
                          ? "text-blue-600 dark:text-blue-400"
                          : concept.masteryLevel >= 40
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {concept.masteryLevel}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Heatmap View - Visual representation of problem types practiced
 */
function HeatmapView({
  data,
}: {
  data: { byType: Record<string, number>; byDifficulty: Record<string, number> };
}) {
  const typeLabels: Record<string, string> = {
    ARITHMETIC: "Arithmetic",
    ALGEBRA: "Algebra",
    GEOMETRY: "Geometry",
    WORD_PROBLEM: "Word Problems",
    MULTI_STEP: "Multi-Step",
    UNKNOWN: "Other",
  };

  const maxCount = Math.max(...Object.values(data.byType), 1);

  if (Object.keys(data.byType).length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        <p className="text-sm">No problems solved yet</p>
        <p className="text-xs mt-1">Start solving problems to see your practice heatmap!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
          Problem Types Practice Heatmap
        </p>
        <p>Darker colors indicate more practice in that category.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(data.byType).map(([type, count]) => {
          const intensity = Math.min(100, (count / maxCount) * 100);
          const opacity = Math.max(0.3, intensity / 100);

          return (
            <div
              key={type}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:scale-105"
              style={{
                backgroundColor: `rgba(99, 102, 241, ${opacity})`, // indigo with opacity
              }}
            >
              <div className="text-center">
                <p className="text-sm font-semibold text-white dark:text-gray-100 mb-1">
                  {typeLabels[type] || type}
                </p>
                <p className="text-2xl font-bold text-white dark:text-gray-100">{count}</p>
                <p className="text-xs text-white/80 dark:text-gray-300 mt-1">problems</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <span>Less practice</span>
        <div className="flex-1 flex gap-1">
          {[0.3, 0.5, 0.7, 1.0].map((opacity) => (
            <div
              key={opacity}
              className="flex-1 h-3 rounded"
              style={{ backgroundColor: `rgba(99, 102, 241, ${opacity})` }}
            />
          ))}
        </div>
        <span>More practice</span>
      </div>
    </div>
  );
}

/**
 * Timeline View - Learning journey over time
 */
function TimelineView({
  data,
}: {
  data: Array<{ date: string; count: number; concepts: string[] }>;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        <p className="text-sm">No activity yet</p>
        <p className="text-xs mt-1">Start solving problems to see your learning timeline!</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
          Learning Journey Timeline
        </p>
        <p>Your problem-solving activity over the last 30 days.</p>
      </div>

      <div className="space-y-2">
        {data.map((entry, index) => {
          const date = new Date(entry.date);
          // Skip if invalid date
          if (isNaN(date.getTime())) return null;
          
          const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
          const dayMonth = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
          const height = Math.max(20, (entry.count / maxCount) * 100);

          return (
            <div key={index} className="flex items-end gap-2">
              <div className="w-16 text-xs text-gray-600 dark:text-gray-400 text-right">
                <div className="font-medium">{dayName}</div>
                <div className="text-[10px]">{dayMonth}</div>
              </div>
              <div className="flex-1 flex items-end gap-1">
                <div
                  className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-pointer"
                  style={{ height: `${height}%` }}
                  title={`${entry.count} problem${entry.count === 1 ? "" : "s"} on ${dayMonth}`}
                />
              </div>
              <div className="w-8 text-xs text-gray-500 dark:text-gray-400 text-center">
                {entry.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Active Days</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.reduce((sum, d) => sum + d.count, 0)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Problems</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {Math.round(data.reduce((sum, d) => sum + d.count, 0) / data.length)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Avg/Day</p>
          </div>
        </div>
      </div>
    </div>
  );
}

