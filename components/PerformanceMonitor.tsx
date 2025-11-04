"use client";

import { useEffect, useState } from "react";

/**
 * Performance monitoring component (development only)
 * Shows performance metrics in development mode
 */
export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    renderTime: number;
    messageCount: number;
  } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const startTime = performance.now();

    const updateMetrics = () => {
      const renderTime = performance.now() - startTime;
      setMetrics({
        renderTime: Math.round(renderTime),
        messageCount: 0,
      });
    };

    const interval = setInterval(updateMetrics, 5000);
    updateMetrics();

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== "development" || !metrics) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-75 font-mono">
      <div>Render: {metrics.renderTime}ms</div>
    </div>
  );
}

