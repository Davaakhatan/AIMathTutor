"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

interface LearningGoal {
  id: string;
  user_id: string;
  student_profile_id: string | null;
  goal_type: "subject_mastery" | "exam_prep" | "skill_building" | "practice_hours";
  target_subject: string;
  target_date: string | null;
  status: "active" | "completed" | "paused" | "cancelled";
  progress: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface LearningGoalsProps {
  isGuestMode?: boolean;
  onSignUpClick?: () => void;
}

/**
 * Learning Goals Component
 * Allows users to create, view, and track learning goals
 */
export default function LearningGoals({ isGuestMode = false, onSignUpClick }: LearningGoalsProps) {
  const { user, activeProfile } = useAuth();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [goalType, setGoalType] = useState<LearningGoal["goal_type"]>("subject_mastery");
  const [targetSubject, setTargetSubject] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // Load goals
  useEffect(() => {
    if (!user || isGuestMode) {
      setLoading(false);
      return;
    }

    loadGoals();
  }, [user, activeProfile?.id, isGuestMode]);

  const loadGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userId: user.id,
        ...(activeProfile?.id && { profileId: activeProfile.id }),
      });

      const response = await fetch(`/api/companion/goals?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load goals");
      }

      setGoals(data.goals || []);
    } catch (err) {
      logger.error("Error loading goals", { error: err });
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetSubject.trim()) return;

    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch("/api/companion/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          profileId: activeProfile?.id || null,
          goal_type: goalType,
          target_subject: targetSubject.trim(),
          target_date: targetDate || null,
          metadata: {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create goal");
      }

      // Reload goals
      await loadGoals();

      // Reset form
      setTargetSubject("");
      setTargetDate("");
      setShowCreateForm(false);
    } catch (err) {
      logger.error("Error creating goal", { error: err });
      setError(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user || !confirm("Are you sure you want to delete this goal?")) return;

    try {
      const params = new URLSearchParams({
        userId: user.id,
        goalId,
      });

      const response = await fetch(`/api/companion/goals?${params}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete goal");
      }

      // Reload goals
      await loadGoals();
    } catch (err) {
      logger.error("Error deleting goal", { error: err });
      setError(err instanceof Error ? err.message : "Failed to delete goal");
    }
  };

  const handlePauseGoal = async (goalId: string) => {
    if (!user) return;

    try {
      const response = await fetch("/api/companion/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          goalId,
          status: "paused",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to pause goal");
      }

      await loadGoals();
    } catch (err) {
      logger.error("Error pausing goal", { error: err });
      setError(err instanceof Error ? err.message : "Failed to pause goal");
    }
  };

  const handleResumeGoal = async (goalId: string) => {
    if (!user) return;

    try {
      const response = await fetch("/api/companion/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          goalId,
          status: "active",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resume goal");
      }

      await loadGoals();
    } catch (err) {
      logger.error("Error resuming goal", { error: err });
      setError(err instanceof Error ? err.message : "Failed to resume goal");
    }
  };

  if (isGuestMode || !user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Sign up to set and track your learning goals!
        </p>
        {onSignUpClick && (
          <button
            onClick={onSignUpClick}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Sign Up
          </button>
        )}
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const pausedGoals = goals.filter((g) => g.status === "paused");

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Learning Goals
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Set goals and track your progress automatically
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Goal</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Create Goal Form */}
      {showCreateForm && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Create New Goal
          </h4>
          <form onSubmit={handleCreateGoal} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Goal Type
              </label>
              <div className="relative">
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as LearningGoal["goal_type"])}
                  className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors appearance-none cursor-pointer"
                >
                  <option value="subject_mastery">Subject Mastery</option>
                  <option value="exam_prep">Exam Preparation</option>
                  <option value="skill_building">Skill Building</option>
                  <option value="practice_hours">Practice Hours</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Subject
              </label>
              <input
                type="text"
                value={targetSubject}
                onChange={(e) => setTargetSubject(e.target.value)}
                placeholder="e.g., Algebra, Geometry, SAT Math, Calculus..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating || !targetSubject.trim()}
                className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 transition-colors text-xs font-medium"
              >
                {isCreating ? "Creating..." : "Create Goal"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setTargetSubject("");
                  setTargetDate("");
                  setError(null);
                }}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading goals...</p>
        </div>
      )}

      {/* Goals List */}
      {!loading && (
        <div className="space-y-4">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Active Goals ({activeGoals.length})
              </h4>
              <div className="space-y-3">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={handleDeleteGoal}
                    onPause={handlePauseGoal}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Paused Goals */}
          {pausedGoals.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Paused ({pausedGoals.length})
              </h4>
              <div className="space-y-3">
                {pausedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={handleDeleteGoal}
                    onResume={handleResumeGoal}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Completed ({completedGoals.length})
              </h4>
              <div className="space-y-3">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={handleDeleteGoal}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {goals.length === 0 && !showCreateForm && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                No goals yet. Create your first learning goal!
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Create Goal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Goal Card Component
 */
function GoalCard({
  goal,
  onDelete,
  onPause,
  onResume,
}: {
  goal: LearningGoal;
  onDelete: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
}) {
  const getGoalTypeLabel = (type: LearningGoal["goal_type"]) => {
    switch (type) {
      case "subject_mastery":
        return "Master";
      case "exam_prep":
        return "Prepare for";
      case "skill_building":
        return "Build";
      case "practice_hours":
        return "Practice";
      default:
        return type;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";

  return (
    <div
      className={`p-3 rounded-lg border ${
        isCompleted
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : isPaused
          ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {getGoalTypeLabel(goal.goal_type)}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {goal.target_subject}
            </span>
            {isCompleted && (
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-medium">
                Completed
              </span>
            )}
            {isPaused && (
              <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full font-medium">
                Paused
              </span>
            )}
          </div>
          {goal.target_date && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Target: {formatDate(goal.target_date)}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {!isCompleted && onPause && !isPaused && (
            <button
              onClick={() => onPause(goal.id)}
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Pause goal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
          {onResume && isPaused && (
            <button
              onClick={() => onResume(goal.id)}
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Resume goal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete goal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {goal.progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isCompleted
                ? "bg-green-600 dark:bg-green-500"
                : "bg-blue-600 dark:bg-blue-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
          />
        </div>
      </div>

      {/* Created Date */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Created {formatDate(goal.created_at) || "recently"}
      </p>
    </div>
  );
}

