"use client";

import { useEffect, useRef } from "react";

/**
 * Hook for managing focus in the chat interface
 * Ensures focus is maintained for accessibility
 */
export function useFocusManagement(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      // Focus the container when it becomes active
      const firstFocusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [isActive]);

  return containerRef;
}

