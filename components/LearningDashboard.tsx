"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ProblemType } from "@/types";

interface ProblemStats {
  totalProblems: number;
  problemsByType: Record<string, number>;
  totalTime: number; // in minutes
  averageExchanges: number;
  problemsSolved: number;
}

interface SavedProblem {
  id: string;
  text: string;
  type: ProblemType;
  savedAt: number;
}

export default function LearningDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [savedProblems] = useLocalStorage<SavedProblem[]>("aitutor-problem-history", []);
  const [stats, setStats] = useState<ProblemStats | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || savedProblems.length === 0) {
      setStats(null);
      return;
    }

    // Calculate statistics
    const problemsByType: Record<string, number> = {};
    let totalTime = 0;
    let totalExchanges = 0;
    let problemsSolved = 0;

    savedProblems.forEach((problem) => {
      // Count by type
      const type = problem.type || "UNKNOWN";
      problemsByType[type] = (problemsByType[type] || 0) + 1;

      // Estimate time (rough estimate: 5 minutes per problem)
      totalTime += 5;
      problemsSolved++;
    });

    setStats({
      totalProblems: savedProblems.length,
      problemsByType,
      totalTime,
      averageExchanges: totalExchanges / Math.max(1, problemsSolved),
      problemsSolved,
    });
  }, [isOpen, savedProblems]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-30 bg-purple-600 text-white rounded-full p-3 shadow-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
        style={{ bottom: "17rem" }}
        aria-label="Open learning dashboard"
        title="Learning Dashboard"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </button>
    );
  }

  const typeLabels: Record<string, string> = {
    ARITHMETIC: "Arithmetic",
    ALGEBRA: "Algebra",
    GEOMETRY: "Geometry",
    WORD_PROBLEM: "Word Problems",
    MULTI_STEP: "Multi-Step",
    UNKNOWN: "Other",
  };

  return (
    <div 
      ref={panelRef}
      className="fixed bottom-4 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Learning Dashboard</h3>
        <div className="flex items-center gap-2">
          {stats && stats.totalProblems > 0 && (
            <button
              onClick={() => {
                const exportData = {
                  totalProblems: stats.totalProblems,
                  problemsSolved: stats.problemsSolved,
                  totalTime: stats.totalTime,
                  averageTime: Math.round(stats.totalTime / stats.totalProblems),
                  problemsByType: stats.problemsByType,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `learning-stats-${new Date().toISOString().split("T")[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors p-1.5 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              title="Export learning data"
              aria-label="Export learning data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Close dashboard"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!stats || stats.totalProblems === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No learning data yet</p>
            <p className="text-xs mt-1">Start solving problems to see your progress</p>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 font-medium mb-1">Problems Solved</p>
                <p className="text-2xl font-light text-blue-900">{stats.problemsSolved}</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-600 font-medium mb-1">Time Spent</p>
                <p className="text-2xl font-light text-green-900">{stats.totalTime} min</p>
              </div>
            </div>

            {/* Problems by Type */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Problems by Type
              </h4>
              <div className="space-y-2">
                {Object.entries(stats.problemsByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {typeLabels[type] || type}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900 rounded-full transition-all"
                            style={{
                              width: `${(count / stats.totalProblems) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Insights */}
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Insights
              </h4>
              <div className="space-y-2 text-xs text-gray-600">
                {Object.entries(stats.problemsByType).length > 0 && (
                  <p>
                    You&apos;ve practiced{" "}
                    <span className="font-medium text-gray-900">
                      {Object.keys(stats.problemsByType).length} different types
                    </span>{" "}
                    of problems.
                  </p>
                )}
                {Object.entries(stats.problemsByType).length > 0 && (
                  <p>
                    Most practiced:{" "}
                    <span className="font-medium text-gray-900">
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
                    <span className="font-medium text-gray-900">
                      {Math.round(stats.totalTime / stats.totalProblems)} minutes
                    </span>
                  </p>
                )}
                {Object.keys(stats.problemsByType).length < 3 && (
                  <p className="text-blue-600 font-medium">
                    💡 Try practicing different problem types for a well-rounded learning experience!
                  </p>
                )}
              </div>
            </div>

            {/* Suggestions */}
            {Object.keys(stats.problemsByType).length > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                  Recommendations
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  {Object.keys(stats.problemsByType).length < 4 && (
                    <p>
                      Consider practicing{" "}
                      <span className="font-medium text-gray-900">
                        {["ARITHMETIC", "ALGEBRA", "GEOMETRY", "WORD_PROBLEM"]
                          .filter((type) => !stats.problemsByType[type])
                          .map((type) => typeLabels[type])
                          .slice(0, 2)
                          .join(" or ")}
                      </span>{" "}
                      to expand your skills.
                    </p>
                  )}
                  {stats.totalProblems >= 10 && (
                    <p className="text-green-600 font-medium">
                      🎉 Great progress! You&apos;ve solved {stats.totalProblems} problems!
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

