"use client";

import { useEffect, useRef } from "react";

/**
 * Provides visual feedback for touch interactions on mobile
 */
interface TouchFeedbackProps {
  children: React.ReactNode;
  className?: string;
}

export default function TouchFeedback({ children, className = "" }: TouchFeedbackProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      element.style.opacity = "0.7";
      element.style.transform = "scale(0.98)";
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        if (element) {
          element.style.opacity = "1";
          element.style.transform = "scale(1)";
        }
      }, 100);
    };

    element.addEventListener("touchstart", handleTouchStart);
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  return (
    <div ref={ref} className={`transition-all duration-150 ${className}`}>
      {children}
    </div>
  );
}

