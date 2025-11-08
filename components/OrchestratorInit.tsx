"use client";

import { useEffect } from "react";
import { initializeOrchestrator } from "@/services/orchestrator";
import { logger } from "@/lib/logger";

/**
 * Component to initialize the orchestrator on app startup
 * Should be included once in the app layout
 */
export default function OrchestratorInit() {
  useEffect(() => {
    try {
      initializeOrchestrator();
      logger.info("Orchestrator initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize orchestrator", { error });
    }
  }, []); // Run once on mount

  return null; // This component doesn't render anything
}

