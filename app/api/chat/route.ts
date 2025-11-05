import { NextRequest, NextResponse } from "next/server";
import { dialogueManager } from "@/services/dialogueManager";
import { contextManager } from "@/services/contextManager";
import { ChatRequest, ChatResponse, Message } from "@/types";
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

    // Extract API key from request if provided (fallback when env var not available)
    const clientApiKey = body.apiKey;
    
    // Log API key status for debugging (don't log the actual key)
    logger.info("Chat API request received", {
      hasClientApiKey: !!clientApiKey,
      clientApiKeyLength: clientApiKey?.length || 0,
      hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      envApiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      isInitialization: !!body.problem,
      hasSessionId: !!body.sessionId,
    });

    // If this is the first message and includes a problem, initialize conversation
    if (body.problem) {
      // Validate problem object
      if (!body.problem.text || typeof body.problem.text !== "string") {
        logger.warn("Invalid problem object in initialization", { problem: body.problem });
        return NextResponse.json(
          {
            success: false,
            error: "Invalid problem object. Problem text is required.",
          } as ChatResponse,
          { status: 400 }
        );
      }

      try {
        // When initializing, we don't need sessionId or message
        const session = dialogueManager.initializeConversation(body.problem);
        
        logger.info("Initializing conversation", {
          sessionId: session.id,
          hasClientApiKey: !!clientApiKey,
          hasEnvApiKey: !!process.env.OPENAI_API_KEY,
        });
        
        // Generate initial tutor message using OpenAI (with API key if provided)
        const difficultyMode = body.difficultyMode || "middle";
        let initialTutorMessage: Message;
        
        try {
          initialTutorMessage = await dialogueManager.generateInitialMessage(
            session.id,
            body.problem,
            difficultyMode as "elementary" | "middle" | "high" | "advanced",
            clientApiKey,
            body.whiteboardImage // Pass whiteboard image if provided
          );
        } catch (generateError) {
          // If initial message generation fails, clean up the session
          logger.error("Failed to generate initial message, cleaning up session", {
            sessionId: session.id,
            error: generateError instanceof Error ? generateError.message : String(generateError),
          });
          // Session will be cleaned up automatically on next request, but we should still throw
          throw generateError;
        }

        // Verify session still exists after initialization
        const verifySession = contextManager.getSession(session.id);
        if (!verifySession) {
          logger.error("Session disappeared after initialization", { sessionId: session.id });
          throw new Error("Session was lost during initialization. Please try again.");
        }

        const allSessions = contextManager.getAllSessions();
        logger.info("Conversation initialized successfully", {
          sessionId: session.id,
          messageCount: verifySession.messages.length,
          totalSessions: allSessions.length,
          allSessionIds: allSessions.map(s => s.id),
        });

        return NextResponse.json({
          success: true,
          response: {
            text: initialTutorMessage.content,
            timestamp: initialTutorMessage.timestamp,
          },
          sessionId: session.id,
        } as ChatResponse & { sessionId: string });
      } catch (initError) {
        const errorDetails = {
          error: initError instanceof Error ? initError.message : "Unknown error",
          errorType: initError instanceof Error ? initError.constructor.name : typeof initError,
          stack: initError instanceof Error ? initError.stack : undefined,
          problem: body.problem ? {
            text: body.problem.text?.substring(0, 100),
            type: body.problem.type,
          } : null,
          hasClientApiKey: !!clientApiKey,
          hasEnvApiKey: !!process.env.OPENAI_API_KEY,
        };
        
        logger.error("Error initializing conversation", errorDetails);
        
        // Provide more detailed error message
        let errorMessage = "Failed to initialize conversation";
        if (initError instanceof Error) {
          errorMessage = initError.message;
          // If it's an API key error, make it more user-friendly
          if (errorMessage.includes("API key") || errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
            errorMessage = "OpenAI API key error. Please check your API key in Settings or .env.local file.";
          }
        }
        
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
          } as ChatResponse,
          { status: 500 }
        );
      }
    }

    // For regular messages, we need both sessionId and message
    if (!body.sessionId || !body.message) {
      logger.warn("Missing required fields", {
        hasSessionId: !!body.sessionId,
        hasMessage: !!body.message,
        messageLength: body.message?.length || 0,
      });
      return NextResponse.json(
        {
          success: false,
          error: body.sessionId 
            ? "Message cannot be empty. Please enter a message."
            : "No active session. Please start a new problem or restart the conversation.",
        } as ChatResponse,
        { status: 400 }
      );
    }

    // Validate session exists
    const session = contextManager.getSession(body.sessionId);
    if (!session) {
      const allSessions = contextManager.getAllSessions();
      logger.error(`Session not found when processing message`, {
        requestedSessionId: body.sessionId,
        totalSessions: allSessions.length,
        allSessionIds: allSessions.map(s => s.id),
        sessionAges: allSessions.map(s => ({
          id: s.id,
          ageSeconds: Math.round((Date.now() - s.createdAt) / 1000),
          messageCount: s.messages.length,
        })),
      });
      
      // Check if session was recently created (within last 10 seconds) - might be a timing issue
      const recentSessions = allSessions.filter(s => 
        Date.now() - s.createdAt < 10000
      );
      
      if (recentSessions.length > 0) {
        logger.warn("Found recent sessions but requested session not found", {
          requestedId: body.sessionId,
          recentSessionIds: recentSessions.map(s => s.id),
        });
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "Session expired or not found. Please start a new conversation.",
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
      difficultyMode as "elementary" | "middle" | "high" | "advanced",
      clientApiKey, // Pass client-provided API key if available
      body.whiteboardImage // Pass whiteboard image if provided
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
    // Enhanced error logging for debugging
    const errorInfo = {
      error: error instanceof Error ? error.message : "Unknown error",
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    };
    
    logger.error("Error in chat API:", errorInfo);
    
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
      } else if (error.message.includes("insufficient_quota") || error.message.includes("quota")) {
        errorMessage = "OpenAI account quota exceeded. Please check your OpenAI account credits.";
        statusCode = 500;
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
        statusCode = 504;
      } else if (error.message.includes("Session")) {
        errorMessage = "Session expired. Please start a new conversation.";
        statusCode = 400;
      }
    }

    // Return error response with more details in development
    const errorResponse: ChatResponse = {
      success: false,
      error: errorMessage,
    };

    // Include more details in development mode
    if (process.env.NODE_ENV === "development") {
      (errorResponse as any).debug = {
        originalError: error instanceof Error ? error.message : String(error),
        errorType: errorInfo.errorType,
      };
    }

    return NextResponse.json(
      errorResponse,
      { status: statusCode }
    );
  }
}

