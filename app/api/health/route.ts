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
    
    // Check Supabase configuration
    const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseServiceKey;
    
    // Basic OpenAI API check (lightweight)
    let openaiAvailable = false;
    let openaiError: string | null = null;
    try {
      // Check if API key exists - if it does, assume client can be initialized
      // Don't actually initialize the client to avoid errors
      openaiAvailable = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
    } catch (error) {
      openaiAvailable = false;
      openaiError = error instanceof Error ? error.message : "Unknown error";
    }

    // Check Supabase connection (lightweight test)
    let supabaseConnectionTest = false;
    let supabaseError: string | null = null;
    if (supabaseConfigured) {
      try {
        const { getSupabaseServer } = await import("@/lib/supabase-server");
        const supabase = getSupabaseServer();
        // Try a simple query to test connection
        const { error } = await supabase.from("profiles").select("id").limit(1);
        supabaseConnectionTest = !error;
        if (error) {
          supabaseError = error.message;
        }
      } catch (error) {
        supabaseConnectionTest = false;
        supabaseError = error instanceof Error ? error.message : "Unknown error";
      }
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
        supabaseConfigured: supabaseConfigured,
        supabaseUrl: supabaseUrl,
        supabaseAnonKey: supabaseAnonKey,
        supabaseServiceKey: supabaseServiceKey,
        supabaseConnectionTest: supabaseConnectionTest,
        supabaseError: supabaseError,
      },
      version: "1.0.0",
    };

    // Return 200 if healthy, 503 if unhealthy
    const statusCode = health.environment.envVarsValid && health.environment.openaiConfigured && health.environment.supabaseConfigured
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

