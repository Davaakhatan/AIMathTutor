import { NextRequest, NextResponse } from "next/server";
import { problemParser } from "@/services/problemParser";
import { ParseProblemRequest, ParseProblemResponse } from "@/types";
import { parseRateLimiter, getClientId } from "@/lib/rateLimit";
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
          headers: {
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
          },
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
    response.headers.set("X-RateLimit-Limit", "10");
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());

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

