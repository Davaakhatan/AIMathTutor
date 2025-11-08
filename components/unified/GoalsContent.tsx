"use client";

import { useState } from "react";
import { useGoals } from "@/hooks/useGoals";
import GoalCard from "@/components/goals/GoalCard";
import { GoalType } from "@/services/goalSystem";

/**
 * Goals Content - Display and manage learning goals
 */
export default function GoalsContent() {
  const { goals, isLoading, isCreating, createNewGoal } = useGoals();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoalSubject, setNewGoalSubject] = useState("");
  const [newGoalType, setNewGoalType] = useState<GoalType>("subject_mastery");
  const [newGoalTarget, setNewGoalTarget] = useState(10);

  const handleCreateGoal = async () => {
    if (!newGoalSubject.trim()) return;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30); // 30 days from now

    await createNewGoal(
      newGoalType,
      newGoalSubject,
      targetDate.toISOString().split("T")[0],
      newGoalTarget
    );

    setShowCreateModal(false);
    setNewGoalSubject("");
    setNewGoalType("subject_mastery");
    setNewGoalTarget(10);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
          Learning Goals
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Set targets and track your progress
        </p>
      </div>

      {/* Create Goal Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all text-sm font-semibold flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>Create New Goal</span>
      </button>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No goals yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create your first learning goal to start tracking progress!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-semibold shadow-md transition-all"
          >
            Create Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Create Learning Goal
            </h3>

            {/* Subject Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject or Topic
              </label>
              <input
                type="text"
                value={newGoalSubject}
                onChange={(e) => setNewGoalSubject(e.target.value)}
                placeholder="e.g., Algebra, Geometry, Calculus"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Goal Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Goal Type
              </label>
              <select
                value={newGoalType}
                onChange={(e) => setNewGoalType(e.target.value as GoalType)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="subject_mastery">Subject Mastery</option>
                <option value="exam_prep">Exam Preparation</option>
                <option value="skill_building">Skill Building</option>
                <option value="daily_practice">Daily Practice</option>
              </select>
            </div>

            {/* Target Problems */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target: {newGoalTarget} problems
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGoal}
                disabled={!newGoalSubject.trim() || isCreating}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Create Goal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

