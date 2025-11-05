import { openai, createOpenAIClient } from "@/lib/openai";
import { contextManager } from "./contextManager";
import { socraticPromptEngine } from "./socraticPromptEngine";
import { responseValidator } from "./responseValidator";
import { ParsedProblem, Message, Session } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";

export class DialogueManager {
  /**
   * Initialize a conversation with a problem
   */
  initializeConversation(problem: ParsedProblem): Session {
    const session = contextManager.createSession(problem);
    // Note: Initial message is now generated via OpenAI API in generateInitialMessage()
    // This method just creates the session
    return session;
  }

  /**
   * Generate initial tutor message using OpenAI API
   */
  async generateInitialMessage(
    sessionId: string,
    problem: ParsedProblem,
    difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle",
    clientApiKey?: string
  ): Promise<Message> {
    // Verify session exists
    const session = contextManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const prompt = socraticPromptEngine.buildInitialPrompt(problem);

    try {
      // Use client-provided API key if available, otherwise use default
      const client = clientApiKey 
        ? createOpenAIClient(clientApiKey)
        : openai;

      // Log which API key source we're using
      logger.debug("Generating initial message with OpenAI", {
        hasClientApiKey: !!clientApiKey,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      });

      // Call OpenAI API
      let response;
      try {
        response = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: socraticPromptEngine.generateSystemPrompt(difficultyMode),
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 200,
        });
      } catch (openaiError: any) {
        // Catch OpenAI SDK errors specifically
        logger.error("OpenAI API call failed for initial message", {
          status: openaiError?.status,
          message: openaiError?.message,
          hasClientApiKey: !!clientApiKey,
          hasEnvApiKey: !!process.env.OPENAI_API_KEY,
        });
        
        if (openaiError?.status === 401 || openaiError?.message?.includes("401") || openaiError?.message?.includes("unauthorized")) {
          throw new Error("Invalid API key. Please check your OpenAI API key in Settings. The key may be incorrect, expired, or revoked.");
        }
        if (openaiError?.status === 429 || openaiError?.message?.includes("429") || openaiError?.message?.includes("rate limit")) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (openaiError?.message?.includes("insufficient_quota") || openaiError?.message?.includes("quota")) {
          throw new Error("OpenAI account quota exceeded. Please check your OpenAI account credits.");
        }
        // Re-throw with more context
        throw new Error(`OpenAI API error: ${openaiError?.message || String(openaiError)}`);
      }

      const tutorResponse = response.choices[0]?.message?.content?.trim();

      if (!tutorResponse) {
        throw new Error("Received empty response from OpenAI. Please try again.");
      }

      // Create tutor message
      const tutorMessage: Message = {
        id: Date.now().toString(),
        role: "tutor",
        content: tutorResponse,
        timestamp: Date.now(),
      };

      // Add message to session
      contextManager.addMessage(sessionId, tutorMessage);

      return tutorMessage;
    } catch (error) {
      logger.error("Error generating initial message", {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Process a user message and get tutor response
   */
  async processMessage(
    sessionId: string,
    userMessage: string,
    difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle",
    clientApiKey?: string, // Optional: Client-provided API key as fallback
    whiteboardImage?: string // Optional: Base64 whiteboard image
  ): Promise<Message> {
    // Add user message to context
    const userMsg: Message = {
      id: uuidv4(),
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    };

    contextManager.addMessage(sessionId, userMsg);

    // Get conversation context
    const context = contextManager.getContext(sessionId);
    if (!context) {
      throw new Error(`Session ${sessionId} not found or has no problem`);
    }

    // Build prompt with context
    const prompt = socraticPromptEngine.buildContext(
      context.problem,
      context.messages,
      context.stuckCount,
      difficultyMode
    );

    try {
      // Validate student response first
      const validation = responseValidator.validateResponse(
        userMessage,
        context.problem,
        context.messages
      );

      // Adjust temperature based on stuck count (more creative when stuck)
      const temperature = context.stuckCount >= 2 ? 0.8 : 0.7;

      // Use client-provided API key if available, otherwise use default
      const client = clientApiKey 
        ? createOpenAIClient(clientApiKey)
        : openai;

      // Log which API key source we're using (for debugging, don't log the actual key)
      logger.debug("Using OpenAI client", {
        hasClientApiKey: !!clientApiKey,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
        envApiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      });

      // Call OpenAI API
      let response;
      try {
        // Build user message content
        const userContent: any[] = [
          {
            type: "text",
            text: prompt,
          },
        ];

        // Add whiteboard image if provided
        if (whiteboardImage) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${whiteboardImage}`,
            },
          });
        }

        response = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: socraticPromptEngine.generateSystemPrompt(difficultyMode) + 
                (whiteboardImage ? "\n\nIMPORTANT: The student has shared a whiteboard drawing. Analyze it carefully and:\n" +
                "1. Reference specific parts of their drawing (e.g., 'I see you drew a triangle with...')\n" +
                "2. Provide visual feedback on their work (e.g., 'The angle looks good, but...')\n" +
                "3. **MISTAKE DETECTION**: If you notice calculation errors, wrong formulas, or incorrect steps in their drawing or written work, point them out constructively:\n" +
                "   - 'I notice you calculated 5 + 3 = 9, but let's check: 5 + 3 = ?'\n" +
                "   - 'The formula you used looks correct, but the calculation might have an error. Can you double-check?'\n" +
                "   - 'I see you labeled angle A, but make sure it matches the problem statement'\n" +
                "4. Suggest visual improvements if needed (e.g., 'Try drawing a perpendicular line here')\n" +
                "5. Acknowledge what they got right visually\n" +
                "6. Guide them with visual suggestions (e.g., 'Let's add labels to make it clearer')\n" +
                "Use the drawing to enhance your guidance, detect mistakes, and make it more interactive and visual." : ""),
            },
            {
              role: "user",
              content: userContent,
            },
          ],
          temperature,
          max_tokens: 250, // Slightly shorter for more focused responses
        });
      } catch (openaiError: any) {
        // Catch OpenAI SDK errors specifically
        logger.error("OpenAI API call failed", {
          status: openaiError?.status,
          message: openaiError?.message,
          hasClientApiKey: !!clientApiKey,
          hasEnvApiKey: !!process.env.OPENAI_API_KEY,
        });
        
        if (openaiError?.status === 401 || openaiError?.message?.includes("401") || openaiError?.message?.includes("unauthorized")) {
          throw new Error("Invalid API key. Please check your OpenAI API key in Settings. The key may be incorrect, expired, or revoked.");
        }
        if (openaiError?.status === 429 || openaiError?.message?.includes("429") || openaiError?.message?.includes("rate limit")) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (openaiError?.message?.includes("insufficient_quota") || openaiError?.message?.includes("quota")) {
          throw new Error("OpenAI account quota exceeded. Please check your OpenAI account credits.");
        }
        // Re-throw with more context
        throw new Error(`OpenAI API error: ${openaiError?.message || String(openaiError)}`);
      }

      const tutorResponse = response.choices[0]?.message?.content?.trim();

      if (!tutorResponse) {
        throw new Error("Received empty response from OpenAI. Please try again.");
      }

      // Basic validation: ensure response is not just whitespace
      if (tutorResponse.length < 5) {
        throw new Error("Received invalid response from tutor. Please try again.");
      }

      // Check if response accidentally contains direct answer (simple heuristic)
      const hasDirectAnswer = /^(the answer is|x equals|x =|solution is|equals)/i.test(tutorResponse);
      if (hasDirectAnswer && tutorResponse.length < 50) {
        // Might be a direct answer, but let it through if it's part of a longer explanation
        logger.warn("Possible direct answer detected", { 
          response: tutorResponse.substring(0, 50),
          sessionId 
        });
      }

      // Create tutor message
      const tutorMsg: Message = {
        id: uuidv4(),
        role: "tutor",
        content: tutorResponse,
        timestamp: Date.now(),
      };

      // Add to context
      contextManager.addMessage(sessionId, tutorMsg);

      return tutorMsg;
    } catch (error) {
      // Enhanced error logging for debugging
      const errorDetails: {
        error: string;
        errorType: string;
        sessionId: string;
        hasClientApiKey: boolean;
        hasEnvApiKey: boolean;
        stack?: string;
        apiError?: string;
      } = {
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        sessionId,
        hasClientApiKey: !!clientApiKey,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      };

      // Log full error details for debugging
      if (error instanceof Error) {
        errorDetails.stack = error.stack;
        // Check if it's an OpenAI API error
        if (error.message.includes("401") || error.message.includes("unauthorized")) {
          errorDetails.apiError = "Authentication failed - API key may be invalid";
        }
        if (error.message.includes("429")) {
          errorDetails.apiError = "Rate limit exceeded";
        }
        if (error.message.includes("insufficient_quota")) {
          errorDetails.apiError = "Insufficient quota - account may be out of credits";
        }
      }

      logger.error("Error processing message", errorDetails);
      
      // Re-throw with more context
      if (error instanceof Error) {
        // Check for specific OpenAI errors
        if (error.message.includes("API key is not configured") ||
            error.message.includes("OPENAI_API_KEY is not set") ||
            error.message.includes("invalid api key") ||
            error.message.includes("401") ||
            error.message.includes("unauthorized")) {
          throw new Error("OpenAI API configuration error. Please check your API key.");
        }
        if (error.message.includes("rate limit") || error.message.includes("429")) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (error.message.includes("insufficient_quota") || error.message.includes("quota")) {
          throw new Error("OpenAI account quota exceeded. Please check your OpenAI account credits.");
        }
        if (error.message.includes("timeout")) {
          throw new Error("Request timed out. Please try again.");
        }
        // Re-throw with original message for better debugging
        throw error;
      }
      
      throw new Error(
        `Failed to get tutor response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get conversation history
   */
  getHistory(sessionId: string): Message[] {
    const session = contextManager.getSession(sessionId);
    return session?.messages || [];
  }
}

export const dialogueManager = new DialogueManager();

