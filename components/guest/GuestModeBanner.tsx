"use client";

interface GuestModeBannerProps {
  message: string;
  onSignUp?: () => void;
  variant?: "info" | "warning";
}

/**
 * Reusable banner component for guest mode indicators
 */
export default function GuestModeBanner({ 
  message, 
  onSignUp,
  variant = "info" 
}: GuestModeBannerProps) {
  const bgColor = variant === "warning" 
    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
  const textColor = variant === "warning"
    ? "text-amber-700 dark:text-amber-300"
    : "text-blue-700 dark:text-blue-300";
  const iconColor = variant === "warning"
    ? "text-amber-600 dark:text-amber-400"
    : "text-blue-600 dark:text-blue-400";

  return (
    <div className={`${bgColor} border rounded-lg p-3 mb-4`}>
      <div className="flex items-start gap-2">
        <svg className={`w-4 h-4 ${iconColor} flex-shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className={`text-xs ${textColor} font-medium`}>
            {message}
            {onSignUp && (
              <>
                {" "}
                <button
                  onClick={onSignUp}
                  className="underline hover:no-underline font-semibold"
                >
                  Sign up
                </button>
                {" "}to save permanently.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

