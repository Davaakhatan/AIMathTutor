import { NextRequest, NextResponse } from "next/server";
import { dialogueManager } from "@/services/dialogueManager";
import { contextManager } from "@/services/contextManager";
import { ChatRequest, ChatResponse } from "@/types";
import { chatRateLimiter, getClientId, createRateLimitHeaders } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    const rateLimit = chatRateLimiter.check(clientId);
    
    if (!rateLimit.allowed) {
      logger.warn(`Rate limit exceeded for client: ${clientId}`);
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please wait a moment and try again.",
        } as ChatResponse,
        { 
          status: 429,
          headers: createRateLimitHeaders(20, 0, rateLimit.resetAt),
        }
      );
    }

    const body: ChatRequest = await request.json();

    // If this is the first message and includes a problem, initialize conversation
    if (body.problem) {
      // When initializing, we don't need sessionId or message
      const session = dialogueManager.initializeConversation(body.problem);
      const history = dialogueManager.getHistory(session.id);

      // Return the initial tutor message
      const initialMessage = history.find((msg) => msg.role === "tutor");
      
      // Note: Difficulty mode is applied in subsequent messages, not initialization
      // The initial message uses default mode
      
      return NextResponse.json({
        success: true,
        response: {
          text: initialMessage?.content || "Let's start working on this problem!",
          timestamp: initialMessage?.timestamp || Date.now(),
        },
        sessionId: session.id,
      } as ChatResponse & { sessionId: string });
    }

    // For regular messages, we need both sessionId and message
    if (!body.sessionId || !body.message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: sessionId and message",
        } as ChatResponse,
        { status: 400 }
      );
    }

    // Validate session exists
    const session = contextManager.getSession(body.sessionId);
    if (!session) {
      logger.warn(`Session not found: ${body.sessionId}`);
      return NextResponse.json(
        {
          success: false,
          error: "Session expired. Please start a new conversation.",
        } as ChatResponse,
        { status: 400 }
      );
    }

    // Validate message length
    if (body.message.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is too long. Please keep it under 1000 characters.",
        } as ChatResponse,
        { status: 400 }
      );
    }

    // Process user message
    const difficultyMode = body.difficultyMode || "middle";
    const tutorResponse = await dialogueManager.processMessage(
      body.sessionId,
      body.message,
      difficultyMode as "elementary" | "middle" | "high" | "advanced"
    );

    const response = NextResponse.json({
      success: true,
      response: {
        text: tutorResponse.content,
        timestamp: tutorResponse.timestamp,
      },
    } as ChatResponse);

    // Add rate limit headers
    const headers = createRateLimitHeaders(20, rateLimit.remaining, rateLimit.resetAt);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    logger.error("Error in chat API:", error);
    
    // Provide user-friendly error messages
    let errorMessage = "Failed to process message";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes("API key is not configured") || 
          error.message.includes("OPENAI_API_KEY is not set") ||
          error.message.includes("invalid api key") ||
          error.message.includes("401") ||
          error.message.includes("unauthorized")) {
        errorMessage = "OpenAI API configuration error. Please check your API key.";
        statusCode = 500;
      } else if (error.message.includes("rate limit") || error.message.includes("429")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
        statusCode = 429;
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
        statusCode = 504;
      } else if (error.message.includes("Session")) {
        errorMessage = "Session expired. Please start a new conversation.";
        statusCode = 400;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      } as ChatResponse,
      { status: statusCode }
    );
  }
}

