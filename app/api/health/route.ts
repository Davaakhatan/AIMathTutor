import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";
import { openai } from "@/lib/openai";

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
  try {
    // Check environment variables at runtime
    const envCheck = validateEnv();
    
    // Check if API key is accessible at runtime
    const apiKeyPresent = !!process.env.OPENAI_API_KEY;
    const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
    const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 3) || "N/A";
    
    // Basic OpenAI API check (lightweight)
    let openaiAvailable = false;
    let openaiError: string | null = null;
    try {
      // Try to access the OpenAI client (only check if chat property exists)
      // Don't actually call anything, just verify it's accessible
      const testClient = openai;
      openaiAvailable = !!testClient && typeof testClient.chat !== "undefined";
    } catch (error) {
      openaiAvailable = false;
      openaiError = error instanceof Error ? error.message : "Unknown error";
    }

    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        envVarsValid: envCheck.valid,
        missingEnvVars: envCheck.missing,
        openaiConfigured: openaiAvailable,
        apiKeyPresent: apiKeyPresent,
        apiKeyLength: apiKeyLength,
        apiKeyPrefix: apiKeyPrefix, // For debugging (safe to expose first 3 chars)
        openaiError: openaiError,
      },
      version: "1.0.0",
    };

    // Return 200 if healthy, 503 if unhealthy
    const statusCode = health.environment.envVarsValid && health.environment.openaiConfigured 
      ? 200 
      : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

