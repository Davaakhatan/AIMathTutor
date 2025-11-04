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
      parsedProblem = await problemParser.parseText(body.data);
    } else if (body.type === "image") {
      // Remove data URL prefix if present
      const base64Data = body.data.replace(/^data:image\/\w+;base64,/, "");
      parsedProblem = await problemParser.parseImage(base64Data);
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

