import { NextRequest, NextResponse } from "next/server";
import { dialogueManager } from "@/services/dialogueManager";
import { contextManager } from "@/services/contextManager";
import { ChatRequest, ChatResponse, Message } from "@/types";
import { chatRateLimiter, getClientId, createRateLimitHeaders } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { eventBus } from "@/lib/eventBus";
import { initializeOrchestrator } from "@/services/orchestrator";

// Ensure orchestrator is initialized (in case module load didn't trigger it)
// TEMPORARILY DISABLED - causing 500 errors
// if (typeof window === "undefined") {
//   // Force initialization check
//   const handlerCount = eventBus.getHandlerCount("problem_completed");
//   if (!orchestrator.isInitialized() || handlerCount === 0) {
//     console.log("⚠️ Orchestrator not initialized, initializing now...");
//     orchestrator.initialize();
//   }
// }

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

    // Extract user ID from request (for authenticated users)
    // Client should send userId in request body, or we can extract from auth header
    let userId: string | undefined = body.userId;
    
    // If userId not in body, try to extract from auth header (JWT token)
    if (!userId) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            const token = authHeader.substring(7);
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (!error && user) {
              userId = user.id;
              logger.debug("Extracted userId from auth header", { userId });
            }
          }
        } catch (error) {
          // Not authenticated, continue as guest
          logger.debug("Could not extract userId from auth header", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

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
      logger.info("Using client-provided API key", {
        clientApiKeyLength: apiKeyToUse?.length || 0,
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
    logger.info("Chat API request received", {
      hasClientApiKey: !!clientApiKey,
      clientApiKeyLength: clientApiKey?.length || 0,
      clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
      hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      envApiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      hasApiKeyToUse: !!apiKeyToUse,
      apiKeyToUseLength: apiKeyToUse?.length || 0,
      isInitialization: !!body.problem,
      hasSessionId: !!body.sessionId,
    });
    
    // Validate API key is available
    if (!apiKeyToUse) {
      logger.error("No API key available", {
        hasClientApiKey: !!clientApiKey,
        clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      });
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key is not configured. Please:\n1. Add OPENAI_API_KEY to your deployment platform (Vercel: Project Settings → Environment Variables, or .env.local for local dev)\n2. Redeploy/restart your server\n3. Or enter a valid API key in Settings (must start with 'sk-' or 'sk-proj-').",
        } as ChatResponse,
        { status: 500 }
      );
    }
    
    // Final validation of the key we're about to use
    if (!apiKeyToUse || !isValidApiKeyFormat(apiKeyToUse)) {
      logger.error("API key format is invalid", {
        apiKeyPrefix: apiKeyToUse ? apiKeyToUse.substring(0, Math.min(10, apiKeyToUse.length)) : "undefined",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API key format. OpenAI API keys must start with 'sk-' or 'sk-proj-'. Please check your API key in Settings or .env.local file.",
        } as ChatResponse,
        { status: 500 }
      );
    }

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
        const difficultyMode = body.difficultyMode || "middle";
        const session = await dialogueManager.initializeConversation(
          body.problem,
          userId,
          difficultyMode as "elementary" | "middle" | "high" | "advanced"
        );
        
        logger.info("Initializing conversation", {
          sessionId: session.id,
          userId: userId || "guest",
          hasClientApiKey: !!clientApiKey,
          hasEnvApiKey: !!process.env.OPENAI_API_KEY,
          hasApiKeyToUse: !!apiKeyToUse,
        });
        
        // Generate initial tutor message using OpenAI (with API key if provided)
        let initialTutorMessage: Message;
        
        try {
          initialTutorMessage = await dialogueManager.generateInitialMessage(
            session.id,
            body.problem,
            difficultyMode as "elementary" | "middle" | "high" | "advanced",
            apiKeyToUse, // Use the determined API key
            body.whiteboardImage, // Pass whiteboard image if provided
            userId // Pass userId for session access
          );
        } catch (generateError) {
          // If initial message generation fails, clean up the session
          logger.error("Failed to generate initial message, cleaning up session", {
            sessionId: session.id,
            userId: userId || "guest",
            error: generateError instanceof Error ? generateError.message : String(generateError),
            hasClientApiKey: !!clientApiKey,
            hasEnvApiKey: !!process.env.OPENAI_API_KEY,
            hasApiKeyToUse: !!apiKeyToUse,
          });
          
          // Clean up the session immediately
          await contextManager.clearSession(session.id, userId);
          
          // Provide more helpful error messages
          if (generateError instanceof Error) {
            const errorMsg = generateError.message;
            if (errorMsg.includes("API key") || errorMsg.includes("401") || errorMsg.includes("unauthorized")) {
              throw new Error("OpenAI API key error. Please check your API key in Settings or .env.local file.");
            } else if (errorMsg.includes("quota") || errorMsg.includes("insufficient_quota")) {
              throw new Error("OpenAI account quota exceeded. Please check your account credits.");
            } else if (errorMsg.includes("rate limit") || errorMsg.includes("429")) {
              throw new Error("Too many requests. Please wait a moment and try again.");
            }
          }
          
          throw generateError;
        }

        // Verify session still exists after initialization
        const verifySession = await contextManager.getSession(session.id, userId);
        if (!verifySession) {
          logger.error("Session disappeared after initialization", { 
            sessionId: session.id,
            userId: userId || "guest",
          });
          throw new Error("Session was lost during initialization. Please try again.");
        }

        const allSessions = contextManager.getAllSessions();
        logger.info("Conversation initialized successfully", {
          sessionId: session.id,
          messageCount: verifySession.messages.length,
          totalSessions: allSessions.length,
          allSessionIds: allSessions.map(s => s.id),
        });

        // Emit session_started event
        // TEMPORARILY DISABLED - event bus not working
        // if (userId && body.problem) {
        //   eventBus.emit({
        //     type: "session_started",
        //     userId,
        //     profileId: body.profileId,
        //     data: {
        //       sessionId: session.id,
        //       problem: {
        //         text: body.problem.text,
        //         type: body.problem.type,
        //         difficulty: difficultyMode,
        //       },
        //     },
        //     timestamp: new Date(),
        //   }).catch((error) => {
        //     logger.error("Error emitting session_started event", { error });
        //   });
        // }

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
          hasApiKeyToUse: !!apiKeyToUse,
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
    const session = await contextManager.getSession(body.sessionId, userId);
    if (!session) {
      const allSessions = contextManager.getAllSessions();
      logger.error(`Session not found when processing message`, {
        requestedSessionId: body.sessionId,
        userId: userId || "guest",
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
    
    // Check if streaming is requested
    const stream = body.stream === true;
    
    console.log("📨 [CHAT ROUTE] Processing message:", {
      stream,
      hasMessage: !!body.message,
      hasSessionId: !!body.sessionId,
      hasProblem: !!body.problem,
      userId: userId || "MISSING",
      profileId: body.profileId || "MISSING",
    });
    
    try {
      // If streaming is requested, use streaming response
      if (stream) {
        console.log("🌊 [CHAT ROUTE] Using STREAMING (completion check will run after stream)");
        return await handleStreamingResponse(
          body.sessionId,
          body.message,
          difficultyMode as "elementary" | "middle" | "high" | "advanced",
          apiKeyToUse, // Use the determined API key
          body.whiteboardImage,
          rateLimit,
          userId, // Pass userId for session persistence
          body.profileId // Pass profileId for completion detection
        );
      }
      
      console.log("💬 [CHAT ROUTE] Using REGULAR response (completion check WILL run)");
      
      // Otherwise, use regular response
      const tutorResponse = await dialogueManager.processMessage(
        body.sessionId,
        body.message,
        difficultyMode as "elementary" | "middle" | "high" | "advanced",
        apiKeyToUse, // Use the determined API key
        body.whiteboardImage, // Pass whiteboard image if provided
        userId // Pass userId for session persistence
      );
      
      // Check if problem is completed (simple heuristic: check if response contains completion indicators)
      const responseText = tutorResponse.content.toLowerCase();
      
      // ALWAYS log the response for debugging
      console.log("🔍 Checking problem completion:", {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 150),
        hasUserId: !!userId,
        hasProblem: !!session.problem,
        sessionId: body.sessionId,
      });
      
      // Use smart completion detection instead of hardcoded phrases
      // Import at top: import { detectProblemCompletion } from "@/services/completionDetector";
      // For now, use simple check but we'll improve this
      const isCompleted = 
        responseText.includes("correct!") ||
        responseText.includes("well done") ||
        responseText.includes("great job") ||
        responseText.includes("you got it") ||
        responseText.includes("that's right") ||
        responseText.includes("excellent") ||
        responseText.includes("perfect!") ||
        responseText.includes("well done on") ||
        responseText.includes("great work") ||
        responseText.includes("you've found") ||
        responseText.includes("you found") ||
        (responseText.includes("solved") && (responseText.includes("correct") || responseText.includes("right"))) ||
        (responseText.includes("correct") && responseText.includes("answer"));
      
      // TODO: Replace with smart detection: detectProblemCompletion(session.messages, session.problem)

      console.log("✅ Completion check result:", {
        isCompleted,
        checkedPhrases: [
          "correct!",
          "well done",
          "great job",
          "you got it",
          "that's right",
          "excellent",
          "perfect!",
          "correct + answer"
        ],
      });

      // Emit problem_completed event if detected
      if (isCompleted && userId && session.problem) {
        console.log("🎉 PROBLEM COMPLETED! Emitting event...", {
          userId,
          profileId: body.profileId,
          sessionId: body.sessionId,
          problemType: session.problem.type,
        });
        
        logger.info("Problem completion detected", {
          userId,
          profileId: body.profileId,
          sessionId: body.sessionId,
          problemType: session.problem.type,
          responseText: responseText.substring(0, 100),
        });
        
        // TEMPORARILY DISABLED - event bus not working
        // eventBus.emit({
        //   type: "problem_completed",
        //   userId,
        //   profileId: body.profileId,
        //   data: {
        //     problem: {
        //       text: session.problem.text,
        //       type: session.problem.type,
        //       difficulty: difficultyMode,
        //     },
        //     sessionId: body.sessionId,
        //     timeSpent: Date.now() - session.createdAt,
        //     hintsUsed: session.messages.filter(m => m.role === "tutor" && m.content.toLowerCase().includes("hint")).length,
        //     attempts: session.messages.filter(m => m.role === "user").length,
        //   },
        //   timestamp: new Date(),
        // }).then(() => {
        //   console.log("✅ problem_completed event emitted successfully");
        // }).catch((error) => {
        //   logger.error("Error emitting problem_completed event", { error });
        //   console.error("❌ Failed to emit problem_completed event:", error);
        // });
      } else if (isCompleted) {
        // Log why event wasn't emitted
        console.warn("⚠️ Problem completed but event NOT emitted:", {
          userId: userId || "MISSING",
          problem: session.problem ? "exists" : "MISSING",
          responsePreview: responseText.substring(0, 100),
        });
        logger.warn("Problem completed but event not emitted", {
          hasUserId: !!userId,
          hasProblem: !!session.problem,
          responseText: responseText.substring(0, 100),
        });
      } else {
        console.log("⏳ Problem not completed yet (no completion phrases found)");
      }

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
    } catch (processError) {
      // Enhanced error handling for OpenAI API errors
      logger.error("Error processing message", {
        error: processError instanceof Error ? processError.message : String(processError),
        sessionId: body.sessionId,
        hasClientApiKey: !!clientApiKey,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
        hasApiKeyToUse: !!apiKeyToUse,
      });
      
      let errorMessage = "Failed to process message";
      let statusCode = 500;
      
      if (processError instanceof Error) {
        errorMessage = processError.message;
        
        // Handle OpenAI API errors
        if (errorMessage.includes("API key") || errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
          errorMessage = "OpenAI API key error. Please check your API key in Settings.";
          statusCode = 401;
        } else if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
          statusCode = 429;
        } else if (errorMessage.includes("quota") || errorMessage.includes("insufficient_quota")) {
          errorMessage = "OpenAI account quota exceeded. Please check your account credits.";
          statusCode = 402;
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

/**
 * Handle streaming response from OpenAI
 */
async function handleStreamingResponse(
  sessionId: string,
  userMessage: string,
  difficultyMode: "elementary" | "middle" | "high" | "advanced",
  clientApiKey: string | undefined,
  whiteboardImage: string | undefined,
  rateLimit: { allowed: boolean; remaining: number; resetAt: number },
  userId?: string,
  profileId?: string | null
): Promise<Response> {
  try {
    // Create a ReadableStream for streaming
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use dialogueManager to get streaming response
          const streamResponse = await dialogueManager.processMessageStreaming(
            sessionId,
            userMessage,
            difficultyMode,
            clientApiKey,
            whiteboardImage,
            userId
          );

          // Stream the response chunks
          for await (const chunk of streamResponse) {
            const data = JSON.stringify({ 
              type: "chunk", 
              content: chunk,
              done: false 
            }) + "\n";
            controller.enqueue(new TextEncoder().encode(data));
          }

          // Send completion signal
          const done = JSON.stringify({ 
            type: "done",
            done: true 
          }) + "\n";
          controller.enqueue(new TextEncoder().encode(done));
          
          // After stream completes, check for problem completion using smart detector
          // Get the session to access the full tutor response
          const session = await contextManager.getSession(sessionId, userId);
          if (session && session.messages && session.messages.length > 0 && userId && session.problem) {
            // Use the smart completion detector instead of simple phrase matching
            // This prevents false positives when AI says "great job" but then asks another question
            const { detectProblemCompletion } = await import("@/services/completionDetector");
            const completionResult = detectProblemCompletion(session.messages, session.problem);
            const isCompleted = completionResult.isCompleted;
            
            const lastMessage = session.messages[session.messages.length - 1];
            console.log("🔍 [STREAMING] Checking problem completion after stream:", {
              responseLength: lastMessage?.content?.length || 0,
              responsePreview: lastMessage?.content?.substring(0, 150) || "",
              hasUserId: !!userId,
              hasProblem: !!session.problem,
              isCompleted,
              score: completionResult.score,
              confidence: completionResult.confidence,
              reasons: completionResult.reasons.slice(0, 2),
            });

            if (isCompleted) {
              console.log("🎉 [STREAMING] PROBLEM COMPLETED! Emitting event...", {
                userId,
                profileId: profileId || null,
                sessionId,
                problemType: session.problem.type,
              });
              
              // CRITICAL FIX: Save Problem of the Day completion immediately
              // Don't wait for component event listener - it might be unmounted!
              const checkAndSaveDailyProblem = async () => {
                try {
                  if (!session.problem) return; // Guard against undefined problem
                  
                  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
                  const problemText = session.problem.text;
                  
                  console.log("📅 Checking if solved problem matches Problem of the Day...", {
                    today,
                    problemTextPreview: problemText.substring(0, 50),
                    userId,
                  });
                  
                  // Use environment variables for API URL (server-side fetch)
                  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
                    ? `https://${process.env.VERCEL_URL}` 
                    : "http://localhost:3002";
                  
                  // Check if today's daily problem matches the solved problem
                  const checkResponse = await fetch(`${baseUrl}/api/daily-problem?action=getProblem&date=${today}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                  });
                  
                  if (checkResponse.ok) {
                    const dailyData = await checkResponse.json();
                    const dailyProblemText = dailyData?.problem?.problem?.text || "";
                    
                    console.log("📅 Daily problem fetched", {
                      hasDailyProblem: !!dailyProblemText,
                      dailyTextPreview: dailyProblemText.substring(0, 50),
                      solvedTextPreview: problemText.substring(0, 50),
                      match: dailyProblemText === problemText,
                    });
                    
                    if (dailyProblemText && dailyProblemText === problemText) {
                      console.log("✅ MATCH! Saving Problem of the Day completion...");
                      
                      // Save the completion
                      const saveResponse = await fetch(`${baseUrl}/api/daily-problem`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "markSolved",
                          date: today,
                          userId,
                          profileId: profileId || null,
                          problemText: problemText,
                        }),
                      });
                      
                      if (saveResponse.ok) {
                        console.log("✅ Problem of the Day completion saved successfully!");
                        logger.info("Problem of the Day auto-saved on completion", { userId, date: today });
                      } else {
                        const errorData = await saveResponse.json();
                        console.error("❌ Failed to save Problem of the Day completion:", errorData);
                        logger.error("Failed to auto-save Problem of the Day", { error: errorData, userId, date: today });
                      }
                    } else {
                      console.log("ℹ️ Solved problem doesn't match today's Problem of the Day");
                    }
                  }
                } catch (error) {
                  console.error("❌ Error checking/saving Problem of the Day:", error);
                  logger.error("Error in checkAndSaveDailyProblem", { error });
                }
              };
              
              // Run async but don't block the response
              checkAndSaveDailyProblem().catch(err => {
                console.error("Unhandled error in checkAndSaveDailyProblem:", err);
              });
              
              // Emit problem_completed event
              // TEMPORARILY DISABLED - event bus not working
              // eventBus.emit({
              //   type: "problem_completed",
              //   userId,
              //   profileId: profileId || undefined,
              //   data: {
              //     problem: {
              //       text: session.problem.text,
              //       type: session.problem.type,
              //       difficulty: difficultyMode,
              //     },
              //     sessionId: sessionId,
              //     timeSpent: Date.now() - session.createdAt,
              //     hintsUsed: session.messages.filter(m => m.role === "tutor" && m.content.toLowerCase().includes("hint")).length,
              //     attempts: session.messages.filter(m => m.role === "user").length,
              //   },
              //   timestamp: new Date(),
              // }).then(() => {
              //   console.log("✅ [STREAMING] problem_completed event emitted successfully");
              // }).catch((error) => {
              //   console.error("❌ [STREAMING] Failed to emit problem_completed event:", error);
              //   logger.error("Error emitting problem_completed event from streaming", { error });
              // });
            } else {
              console.log("⏳ [STREAMING] Problem not completed yet (no completion phrases found)");
            }
          }
          
          controller.close();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Streaming error";
          const errorData = JSON.stringify({ 
            type: "error", 
            error: errorMsg 
          }) + "\n";
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    // Return streaming response
    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

    // Add rate limit headers
    const headers = createRateLimitHeaders(20, rateLimit.remaining, rateLimit.resetAt);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    logger.error("Error in streaming response", {
      error: error instanceof Error ? error.message : String(error),
      sessionId,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Streaming failed",
      } as ChatResponse,
      { status: 500 }
    );
  }
}

