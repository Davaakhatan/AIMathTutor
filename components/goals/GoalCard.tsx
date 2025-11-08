"use client";

import { LearningGoal } from "@/services/goalSystem";

interface GoalCardProps {
  goal: LearningGoal;
  onComplete?: () => void;
}

/**
 * Display a single learning goal with progress
 */
export default function GoalCard({ goal, onComplete }: GoalCardProps) {
  const isCompleted = goal.status === "completed";
  const progress = goal.progress || 0;
  const problemsCompleted = goal.problems_completed || 0;
  const targetProblems = goal.target_problems || 10;

  // Get color based on goal type
  const getGoalColor = () => {
    switch (goal.goal_type) {
      case "subject_mastery":
        return { from: "from-blue-500", to: "to-cyan-500", bg: "bg-blue-50", text: "text-blue-700" };
      case "exam_prep":
        return { from: "from-red-500", to: "to-orange-500", bg: "bg-red-50", text: "text-red-700" };
      case "skill_building":
        return { from: "from-green-500", to: "to-emerald-500", bg: "bg-green-50", text: "text-green-700" };
      case "daily_practice":
        return { from: "from-purple-500", to: "to-pink-500", bg: "bg-purple-50", text: "text-purple-700" };
      default:
        return { from: "from-gray-500", to: "to-gray-600", bg: "bg-gray-50", text: "text-gray-700" };
    }
  };

  const colors = getGoalColor();

  return (
    <div className={`bg-gradient-to-br from-white ${colors.bg} dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 ${
      isCompleted ? "border-green-300 dark:border-green-700" : "border-gray-200 dark:border-gray-700"
    } shadow-lg p-4 transition-all duration-300 hover:shadow-xl`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{goal.target_subject}</h3>
            {isCompleted && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                ✓ Complete
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
            {goal.goal_type.replace("_", " ")}
          </p>
        </div>
        
        {/* Progress Circle */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
              className={`bg-gradient-to-r ${colors.from} ${colors.to} transition-all duration-500`}
              style={{
                stroke: `url(#gradient-${goal.id})`
              }}
            />
            <defs>
              <linearGradient id={`gradient-${goal.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={colors.from} style={{ stopColor: 'currentColor' }} />
                <stop offset="100%" className={colors.to} style={{ stopColor: 'currentColor' }} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${colors.text} dark:text-gray-300`}>
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{problemsCompleted} / {targetProblems} problems</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${colors.from} ${colors.to} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Target Date */}
      {goal.target_date && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
        </div>
      )}

      {/* Completion Action */}
      {isCompleted && onComplete && (
        <button
          onClick={onComplete}
          className="mt-3 w-full text-xs px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold shadow-md transition-all"
        >
          View Next Recommendation
        </button>
      )}
    </div>
  );
}

