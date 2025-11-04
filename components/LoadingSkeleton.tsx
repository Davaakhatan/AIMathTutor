"use client";

interface LoadingSkeletonProps {
  type?: "message" | "list" | "text" | "button";
  count?: number;
}

export default function LoadingSkeleton({
  type = "text",
  count = 1,
}: LoadingSkeletonProps) {
  if (type === "message") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-gray-200 rounded animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    );
  }

  if (type === "button") {
    return (
      <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse mb-2"
          style={{
            animationDelay: `${i * 100}ms`,
            width: i === count - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </>
  );
}

