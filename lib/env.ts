/**
 * Environment variable validation and utilities
 */

/**
 * Validate required environment variables
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = ["OPENAI_API_KEY"];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
}

/**
 * Get API configuration
 */
export function getApiConfig() {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    nodeEnv: process.env.NODE_ENV || "development",
  };
}

