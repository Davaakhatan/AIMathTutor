import { NextRequest, NextResponse } from "next/server";
import { problemParser } from "@/services/problemParser";
import { ParseProblemRequest, ParseProblemResponse } from "@/types";
import { parseRateLimiter, getClientId, createRateLimitHeaders } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    const rateLimit = parseRateLimiter.check(clientId);
    
    if (!rateLimit.allowed) {
      logger.warn(`Rate limit exceeded for parse-problem: ${clientId}`);
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please wait a moment and try again.",
        } as ParseProblemResponse,
        { 
          status: 429,
          headers: createRateLimitHeaders(10, 0, rateLimit.resetAt),
        }
      );
    }

    const body: ParseProblemRequest = await request.json();

    // Extract API key from request if provided (fallback when env var not available)
    const clientApiKey = body.apiKey;
    
    // Helper function to validate API key format
    const isValidApiKeyFormat = (key: string | undefined): boolean => {
      if (!key || key.length === 0) return false;
      const trimmed = key.trim();
      return trimmed.startsWith("sk-") || trimmed.startsWith("sk-proj-");
    };
    
    // Determine which API key to use: client-provided (if valid) > environment variable
    // If client key is provided but invalid, fall back to env var
    let apiKeyToUse: string | undefined;
    if (clientApiKey && isValidApiKeyFormat(clientApiKey)) {
      apiKeyToUse = clientApiKey.trim();
      logger.info("Using client-provided API key for parse-problem", {
        clientApiKeyLength: apiKeyToUse.length,
      });
    } else if (clientApiKey && !isValidApiKeyFormat(clientApiKey)) {
      logger.warn("Client-provided API key has invalid format, falling back to environment variable", {
        clientApiKeyPrefix: clientApiKey.substring(0, Math.min(10, clientApiKey.length)),
      });
      apiKeyToUse = process.env.OPENAI_API_KEY?.trim();
    } else {
      apiKeyToUse = process.env.OPENAI_API_KEY?.trim();
    }
    
    // Log API key status for debugging (don't log the actual key)
    logger.info("Parse-problem API request received", {
      type: body.type,
      hasClientApiKey: !!clientApiKey,
      clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
      hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      hasApiKeyToUse: !!apiKeyToUse,
    });
    
    // Validate API key is available (only needed for image parsing)
    if (body.type === "image" && !apiKeyToUse) {
      logger.error("No API key available for image parsing", {
        hasClientApiKey: !!clientApiKey,
        clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      });
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key is not configured. Please:\n1. Add OPENAI_API_KEY to your .env.local file\n2. Restart your dev server\n3. Or enter a valid API key in Settings (must start with 'sk-' or 'sk-proj-').",
        } as ParseProblemResponse,
        { status: 500 }
      );
    }
    
    // Final validation of the key we're about to use (only for image parsing)
    if (body.type === "image" && apiKeyToUse && !isValidApiKeyFormat(apiKeyToUse)) {
      logger.error("API key format is invalid for image parsing", {
        apiKeyPrefix: apiKeyToUse.substring(0, Math.min(10, apiKeyToUse.length)),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API key format. OpenAI API keys must start with 'sk-' or 'sk-proj-'. Please check your API key in Settings or .env.local file.",
        } as ParseProblemResponse,
        { status: 500 }
      );
    }

    if (!body.type || !body.data) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: type and data",
        } as ParseProblemResponse,
        { status: 400 }
      );
    }

    // Validate input data
    if (body.type === "text") {
      if (typeof body.data !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid data type for text input",
          } as ParseProblemResponse,
          { status: 400 }
        );
      }
      if (body.data.length > 500) {
        return NextResponse.json(
          {
            success: false,
            error: "Text input is too long. Maximum 500 characters.",
          } as ParseProblemResponse,
          { status: 400 }
        );
      }
      if (body.data.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Text input cannot be empty",
          } as ParseProblemResponse,
          { status: 400 }
        );
      }
    } else if (body.type === "image") {
      if (typeof body.data !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid data type for image input",
          } as ParseProblemResponse,
          { status: 400 }
        );
      }
      // Basic base64 validation
      if (!body.data || body.data.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Image data is empty",
          } as ParseProblemResponse,
          { status: 400 }
        );
      }
    }

    let parsedProblem;

    if (body.type === "text") {
      parsedProblem = await problemParser.parseText(body.data, apiKeyToUse);
    } else if (body.type === "image") {
      // Remove data URL prefix if present
      const base64Data = body.data.replace(/^data:image\/\w+;base64,/, "");
      parsedProblem = await problemParser.parseImage(base64Data, apiKeyToUse);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid type. Must be 'text' or 'image'",
        } as ParseProblemResponse,
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      problem: parsedProblem,
    } as ParseProblemResponse);

    // Add rate limit headers
    const headers = createRateLimitHeaders(10, rateLimit.remaining, rateLimit.resetAt);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    logger.error("Error parsing problem:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse problem",
      } as ParseProblemResponse,
      { status: 500 }
    );
  }
}

