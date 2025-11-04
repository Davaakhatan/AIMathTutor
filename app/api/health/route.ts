import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";
import { openai } from "@/lib/openai";

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
  try {
    // Check environment variables
    const envCheck = validateEnv();
    
    // Basic OpenAI API check (lightweight)
    let openaiAvailable = false;
    try {
      // Just check if client is initialized
      openaiAvailable = !!openai;
    } catch (error) {
      openaiAvailable = false;
    }

    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        envVarsValid: envCheck.valid,
        missingEnvVars: envCheck.missing,
        openaiConfigured: openaiAvailable,
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
      },
      { status: 500 }
    );
  }
}

