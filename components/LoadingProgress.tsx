"use client";

interface LoadingProgressProps {
  progress?: number;
  message?: string;
}

/**
 * Shows a progress bar for long-running operations
 */
export default function LoadingProgress({
  progress = 0,
  message = "Loading...",
}: LoadingProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-600 font-light">{message}</span>
        {progress > 0 && (
          <span className="text-xs text-gray-500 font-light">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gray-900 h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

