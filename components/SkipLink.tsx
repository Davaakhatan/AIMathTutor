"use client";

import { useEffect, useState } from "react";

/**
 * Skip link for accessibility - allows keyboard users to skip to main content
 * Only renders on client to avoid hydration mismatches
 */
export default function SkipLink() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-gray-900 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}

