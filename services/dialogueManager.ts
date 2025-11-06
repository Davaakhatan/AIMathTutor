import { openai, createOpenAIClient } from "@/lib/openai";
import { contextManager } from "./contextManager";
import { socraticPromptEngine } from "./socraticPromptEngine";
import { analyzeSentiment } from "./sentimentAnalyzer";
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
    clientApiKey?: string,
    whiteboardImage?: string // Optional: Base64 whiteboard image
  ): Promise<Message> {
    // Extract image from problem.imageUrl if present (uploaded images)
    const uploadedImage = problem.imageUrl;
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
        hasUploadedImage: !!uploadedImage,
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

        // Add uploaded image if present (from problem.imageUrl)
        if (uploadedImage) {
          // Handle both data URLs and base64 strings
          let imageUrl = uploadedImage;
          if (uploadedImage.startsWith('data:image')) {
            // Already a data URL, use as-is
            imageUrl = uploadedImage;
          } else {
            // Plain base64, add data URL prefix
            imageUrl = `data:image/png;base64,${uploadedImage}`;
          }
          
          logger.debug("Adding uploaded problem image to initial message", {
            hasImage: true,
            imageUrlLength: imageUrl.length,
            imageUrlPrefix: imageUrl.substring(0, 50),
          });
          
          userContent.push({
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high", // Use high detail for better text/shape recognition
            },
          });
        }

        // Add whiteboard image if provided (takes precedence if both exist)
        if (whiteboardImage) {
          // Handle both data URLs and base64 strings
          let imageUrl = whiteboardImage;
          if (whiteboardImage.startsWith('data:image')) {
            // Already a data URL, use as-is
            imageUrl = whiteboardImage;
          } else {
            // Plain base64, add data URL prefix
            imageUrl = `data:image/png;base64,${whiteboardImage}`;
          }
          
          logger.debug("Adding whiteboard image to initial message", {
            hasImage: true,
            imageUrlLength: imageUrl.length,
          });
          
          userContent.push({
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high", // Use high detail for better text/shape recognition
            },
          });
        }

        response = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: socraticPromptEngine.generateSystemPrompt(difficultyMode) +
                ((uploadedImage || whiteboardImage) ? "\n\n" +
                  "═══════════════════════════════════════════════════════════════\n" +
                  "🚨 CRITICAL: VISUAL DIAGRAM/IMAGE IS PRESENT WITH THIS PROBLEM 🚨\n" +
                  "═══════════════════════════════════════════════════════════════\n\n" +
                  "**YOU MUST ANALYZE THE VISUAL IMAGE BEFORE RESPONDING TO ANYTHING ELSE.**\n\n" +
                  "**STEP 1: IMMEDIATE VISUAL ANALYSIS**\n" +
                  "Look at the image NOW. You MUST identify:\n" +
                  "- ALL geometric shapes (triangles, rectangles, circles, lines, angles)\n" +
                  "- ALL text labels, numbers, letters, variables (like x, y, z)\n" +
                  "- ALL vertex labels (A, B, C, D, etc.) if present\n" +
                  "- ALL measurements, dimensions, arrows, annotations\n" +
                  "- Spatial relationships and arrangement\n" +
                  "- Right angle indicators (small squares at vertices)\n" +
                  "- Any mathematical relationships visible in the diagram\n\n" +
                  "**STEP 2: MATCH IMAGE TO PROBLEM TEXT**\n" +
                  "Compare the image to the problem statement. The image IS the visual representation of the problem.\n" +
                  "If the problem says 'Find the value of x' and the image shows a right triangle with sides labeled '6 m', 'x', and '10 m', " +
                  "then you are looking at a Pythagorean Theorem problem where x is a side length.\n\n" +
                  "**STEP 3: YOUR RESPONSE MUST START WITH ACKNOWLEDGING THE IMAGE**\n" +
                  "Your FIRST sentence MUST acknowledge exactly what you see in the image. Describe:\n" +
                  "- 'I can see you have a right triangle with sides labeled 6 m, x, and 10 m...'\n" +
                  "- 'Looking at your diagram, I notice a right triangle...'\n" +
                  "- Reference specific measurements from the image (6 m, x, 10 m)\n" +
                  "- Identify the triangle type and which side is the hypotenuse\n\n" +
                  "**STEP 4: USE THE IMAGE TO GUIDE YOUR TUTORING**\n" +
                  "Reference specific elements from the image in your questions:\n" +
                  "- 'What do you know about the side labeled 6 m?'\n" +
                  "- 'Can you tell me about the relationship between the hypotenuse (10 m) and the other two sides?'\n" +
                  "- 'What theorem or formula connects these three sides in a right triangle?'\n" +
                  "- 'Which side is the hypotenuse? Which sides are the legs?'\n\n" +
                  "**CRITICAL: DO NOT ignore the image. The image contains essential information that the text alone cannot convey.**\n" +
                  "If the problem text mentions 'Find the value of x' and the image shows a triangle with labeled sides, " +
                  "you MUST recognize this is a geometry problem and help the student use the appropriate theorem.\n" +
                  "═══════════════════════════════════════════════════════════════\n" : ""),
            },
            {
              role: "user",
              content: userContent,
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

    // Analyze sentiment from the user's message
    const sentimentAnalysis = analyzeSentiment(userMessage);

    // Build prompt with context (including sentiment analysis)
    let prompt = socraticPromptEngine.buildContext(
      context.problem,
      context.messages,
      context.stuckCount,
      difficultyMode,
      sentimentAnalysis
    );
    
    // If whiteboard image is present, REPLACE the problem context with drawing-focused instructions
    if (whiteboardImage) {
      // Completely replace the prompt to focus ONLY on the drawing
      // DO NOT include the original problem text at all
      const recentMessages = context.messages.slice(-2); // Only last 2 messages to avoid confusion
      prompt = "🚨 CRITICAL: The student has shared a whiteboard drawing. " +
        "COMPLETELY IGNORE any problem text, equations, or algebra mentioned anywhere in the conversation. " +
        "The ONLY thing that matters is what you see in the whiteboard drawing image.\n\n" +
        "Look at the drawing image and identify:\n" +
        "- What shapes are drawn (triangle, rectangle, circle, etc.)\n" +
        "- What labels, numbers, and variables are written on it\n" +
        "- Any text written on the drawing (like 'Find x')\n\n" +
        "Work ONLY with what's in the drawing. If the student drew a triangle with side 3 and wrote 'Find x', " +
        "help them find x in that triangle using geometry (Pythagorean theorem, trigonometry, etc.) - NOT algebra.\n\n" +
        (recentMessages.length > 0 ? "Recent messages (for context only - ignore any math problems mentioned):\n" +
        recentMessages.map(msg => {
          const role = msg.role === "user" ? "Student" : "Tutor";
          const content = msg.content.length > 150 
            ? msg.content.substring(0, 150) + "..." 
            : msg.content;
          return `${role}: ${content}`;
        }).join("\n") : "");
    }

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
          // Handle both data URLs and base64 strings
          let imageUrl = whiteboardImage;
          if (whiteboardImage.startsWith('data:image')) {
            // Already a data URL, use as-is
            imageUrl = whiteboardImage;
          } else {
            // Plain base64, add data URL prefix
            imageUrl = `data:image/png;base64,${whiteboardImage}`;
          }
          
          // Log for debugging
          logger.debug("Whiteboard image detected", {
            hasImage: true,
            imageUrlLength: imageUrl.length,
            willBeSentToAI: true,
          });
          logger.debug("Adding whiteboard image to API request", {
            hasImage: true,
            imageUrlLength: imageUrl.length,
            imageUrlPrefix: imageUrl.substring(0, 50),
          });
          
          userContent.push({
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high", // Use high detail for better text/shape recognition
            },
          });
        } else {
          logger.debug("No whiteboard image in request");
        }

        response = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: socraticPromptEngine.generateSystemPrompt(difficultyMode) + 
                (whiteboardImage ? "\n\n" +
                  "═══════════════════════════════════════════════════════════════\n" +
                  "🚨 CRITICAL: WHITEBOARD DRAWING IS PRESENT IN THIS MESSAGE 🚨\n" +
                  "═══════════════════════════════════════════════════════════════\n\n" +
                  "**YOU MUST ANALYZE THE WHITEBOARD DRAWING BEFORE RESPONDING TO ANYTHING ELSE.**\n\n" +
                  "**STEP 1: IMMEDIATE VISUAL ANALYSIS**\n" +
                  "Look at the whiteboard drawing image NOW. You MUST identify:\n" +
                  "- ALL geometric shapes (triangles, rectangles, circles, lines, angles)\n" +
                  "- ALL text labels, numbers, letters, variables (like x, y, z)\n" +
                  "- ALL vertex labels (A, B, C, D, etc.) if present\n" +
                  "- ALL measurements, dimensions, arrows, annotations\n" +
                  "- Spatial relationships and arrangement\n\n" +
                  "**STEP 2: YOUR RESPONSE MUST START WITH ACKNOWLEDGING THE DRAWING**\n" +
                  "Your FIRST sentence MUST acknowledge exactly what you see in the drawing. Describe:\n" +
                  "- The shapes you see (triangle, rectangle, circle, etc.)\n" +
                  "- ALL labels, numbers, and variables visible in the drawing\n" +
                  "- The exact measurements and variables as they appear\n" +
                  "- Example format: 'I can see your drawing! You've drawn a [shape] with [describe what you see].'\n\n" +
                  "**STEP 3: WORK WITH WHAT THEY ACTUALLY DREW**\n" +
                  "Analyze the drawing and work with the ACTUAL elements visible:\n" +
                  "- If it's a triangle, identify which sides/angles are labeled and with what values/variables\n" +
                  "- Use appropriate mathematical principles (Pythagorean theorem, trigonometry, etc.) based on what's shown\n" +
                  "- Reference the SPECIFIC labels, numbers, and variables as they appear in the drawing\n" +
                  "- Make the drawing the PRIMARY focus of your response\n\n" +
                  "**STEP 4: IF PROBLEM TEXT SEEMS UNRELATED**\n" +
                  "If the problem text mentions something different than what's in the drawing:\n" +
                  "- Acknowledge what you see in the drawing first\n" +
                  "- State that you'll work with what they drew, not the unrelated problem text\n" +
                  "- Focus entirely on the drawing\n\n" +
                  "**STEP 5: REFERENCE SPECIFIC ELEMENTS FROM THE DRAWING**\n" +
                  "Throughout your response, constantly reference the actual elements from the drawing:\n" +
                  "- Use the exact labels, numbers, and variables as they appear\n" +
                  "- Reference specific parts: 'The side you labeled as...', 'The variable x you wrote...', etc.\n\n" +
                  "**STEP 6: COLLABORATIVE DRAWING SUGGESTIONS**\n" +
                  "When guiding the student, provide specific, actionable drawing suggestions:\n" +
                  "- Use phrases like 'Let's add a height line here' or 'Try drawing a perpendicular line'\n" +
                  "- Be specific: 'Draw a triangle with sides labeled 6 m, x, and 10 m'\n" +
                  "- Suggest labels: 'Add a label \"x\" here' or 'Label the hypotenuse as \"c\"'\n" +
                  "- Guide step-by-step: 'First draw the base, then add the height line'\n" +
                  "- Make it conversational: 'Let's work together - why don't you add a line from point A to point B?'\n\n" +
                  "═══════════════════════════════════════════════════════════════\n" +
                  "**🚨 CRITICAL RULES WHEN DRAWING IS PRESENT:**\n" +
                  "1. **IGNORE ALL PROBLEM TEXT** - If the problem text mentions algebra equations, fractions, or anything else that's NOT in the drawing, COMPLETELY IGNORE IT.\n" +
                  "2. **THE DRAWING IS THE ONLY SOURCE OF TRUTH** - Work ONLY with what you see in the drawing image.\n" +
                  "3. **DO NOT mention algebra, equations, fractions, or any math concepts** unless they appear in the drawing itself.\n" +
                  "4. **If they drew a triangle with side 3 and 'Find x' written on it, help them find x in that triangle** - NOT in any algebra equation.\n" +
                  "5. **ANALYZE THE DRAWING DYNAMICALLY** - Work with whatever shapes, labels, numbers, and variables are actually visible in the drawing.\n" +
                  "═══════════════════════════════════════════════════════════════\n" : "") +
                "\n\n**EXAMPLE DRAWINGS**: If the student is stuck or would benefit from a visual example, you can provide a drawing example. " +
                "When suggesting an example, you can describe it clearly (e.g., 'Here's how to set up this problem: draw a right triangle with base 5 and height 3'). " +
                "For geometry problems, visual examples are especially helpful.",
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
   * Process a user message and get streaming tutor response
   */
  async *processMessageStreaming(
    sessionId: string,
    userMessage: string,
    difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle",
    clientApiKey?: string,
    whiteboardImage?: string
  ): AsyncGenerator<string, void, unknown> {
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

    // Analyze sentiment from the user's message
    const sentimentAnalysis = analyzeSentiment(userMessage);

    // Build prompt with context (including sentiment analysis)
    let prompt = socraticPromptEngine.buildContext(
      context.problem,
      context.messages,
      context.stuckCount,
      difficultyMode,
      sentimentAnalysis
    );
    
    // If whiteboard image is present, REPLACE the problem context with drawing-focused instructions
    if (whiteboardImage) {
      const recentMessages = context.messages.slice(-2);
      prompt = "🚨 CRITICAL: The student has shared a whiteboard drawing. " +
        "COMPLETELY IGNORE any problem text, equations, or algebra mentioned anywhere in the conversation. " +
        "The ONLY thing that matters is what you see in the whiteboard drawing image.\n\n" +
        "Look at the drawing image and identify:\n" +
        "- What shapes are drawn (triangle, rectangle, circle, etc.)\n" +
        "- What labels, numbers, and variables are written on it\n" +
        "- Any text written on the drawing (like 'Find x')\n\n" +
        "Work ONLY with what's in the drawing. If the student drew a triangle with side 3 and wrote 'Find x', " +
        "help them find x in that triangle using geometry (Pythagorean theorem, trigonometry, etc.) - NOT algebra.\n\n" +
        (recentMessages.length > 0 ? "Recent messages (for context only - ignore any math problems mentioned):\n" +
        recentMessages.map(msg => {
          const role = msg.role === "user" ? "Student" : "Tutor";
          const content = msg.content.length > 150 
            ? msg.content.substring(0, 150) + "..." 
            : msg.content;
          return `${role}: ${content}`;
        }).join("\n") : "");
    }

    try {
      // Validate student response first
      const validation = responseValidator.validateResponse(
        userMessage,
        context.problem,
        context.messages
      );

      // Adjust temperature based on stuck count
      const temperature = context.stuckCount >= 2 ? 0.8 : 0.7;

      // Use client-provided API key if available, otherwise use default
      const client = clientApiKey 
        ? createOpenAIClient(clientApiKey)
        : openai;

      // Build user message content
      const userContent: any[] = [
        {
          type: "text",
          text: prompt,
        },
      ];

      // Add whiteboard image if provided
      if (whiteboardImage) {
        let imageUrl = whiteboardImage;
        if (whiteboardImage.startsWith('data:image')) {
          imageUrl = whiteboardImage;
        } else {
          imageUrl = `data:image/png;base64,${whiteboardImage}`;
        }
        
        userContent.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
            detail: "high",
          },
        });
      }

      // Call OpenAI API with streaming
      const stream = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: socraticPromptEngine.generateSystemPrompt(difficultyMode) + 
              (whiteboardImage ? "\n\n" +
                "═══════════════════════════════════════════════════════════════\n" +
                "🚨 CRITICAL: WHITEBOARD DRAWING IS PRESENT IN THIS MESSAGE 🚨\n" +
                "═══════════════════════════════════════════════════════════════\n\n" +
                "**YOU MUST ANALYZE THE WHITEBOARD DRAWING BEFORE RESPONDING TO ANYTHING ELSE.**\n\n" +
                "**STEP 1: IMMEDIATE VISUAL ANALYSIS**\n" +
                "Look at the whiteboard drawing image NOW. You MUST identify:\n" +
                "- ALL geometric shapes (triangles, rectangles, circles, lines, angles)\n" +
                "- ALL text labels, numbers, letters, variables (like x, y, z)\n" +
                "- ALL vertex labels (A, B, C, D, etc.) if present\n" +
                "- ALL measurements, dimensions, arrows, annotations\n" +
                "- Spatial relationships and arrangement\n\n" +
                "**STEP 2: YOUR RESPONSE MUST START WITH ACKNOWLEDGING THE DRAWING**\n" +
                "Your FIRST sentence MUST acknowledge exactly what you see in the drawing. Describe:\n" +
                "- The shapes you see (triangle, rectangle, circle, etc.)\n" +
                "- ALL labels, numbers, and variables visible in the drawing\n" +
                "- The exact measurements and variables as they appear\n" +
                "- Example format: 'I can see your drawing! You've drawn a [shape] with [describe what you see].'\n\n" +
                "**STEP 3: WORK WITH WHAT THEY ACTUALLY DREW**\n" +
                "Analyze the drawing and work with the ACTUAL elements visible:\n" +
                "- If it's a triangle, identify which sides/angles are labeled and with what values/variables\n" +
                "- Use appropriate mathematical principles (Pythagorean theorem, trigonometry, etc.) based on what's shown\n" +
                "- Reference the SPECIFIC labels, numbers, and variables as they appear in the drawing\n" +
                "- Make the drawing the PRIMARY focus of your response\n\n" +
                "**STEP 4: IF PROBLEM TEXT SEEMS UNRELATED**\n" +
                "If the problem text mentions something different than what's in the drawing:\n" +
                "- Acknowledge what you see in the drawing first\n" +
                "- State that you'll work with what they drew, not the unrelated problem text\n" +
                "- Focus entirely on the drawing\n\n" +
                "**STEP 5: REFERENCE SPECIFIC ELEMENTS FROM THE DRAWING**\n" +
                "Throughout your response, constantly reference the actual elements from the drawing:\n" +
                "- Use the exact labels, numbers, and variables as they appear\n" +
                "- Reference specific parts: 'The side you labeled as...', 'The variable x you wrote...', etc.\n\n" +
                "**STEP 6: COLLABORATIVE DRAWING SUGGESTIONS**\n" +
                "When guiding the student, provide specific, actionable drawing suggestions:\n" +
                "- Use phrases like 'Let's add a height line here' or 'Try drawing a perpendicular line'\n" +
                "- Be specific: 'Draw a triangle with sides labeled 6 m, x, and 10 m'\n" +
                "- Suggest labels: 'Add a label \"x\" here' or 'Label the hypotenuse as \"c\"'\n" +
                "- Guide step-by-step: 'First draw the base, then add the height line'\n" +
                "- Make it conversational: 'Let's work together - why don't you add a line from point A to point B?'\n\n" +
                "═══════════════════════════════════════════════════════════════\n" +
                "**🚨 CRITICAL RULES WHEN DRAWING IS PRESENT:**\n" +
                "1. **IGNORE ALL PROBLEM TEXT** - If the problem text mentions algebra equations, fractions, or anything else that's NOT in the drawing, COMPLETELY IGNORE IT.\n" +
                "2. **THE DRAWING IS THE ONLY SOURCE OF TRUTH** - Work ONLY with what you see in the drawing image.\n" +
                "3. **DO NOT mention algebra, equations, fractions, or any math concepts** unless they appear in the drawing itself.\n" +
                "4. **If they drew a triangle with side 3 and 'Find x' written on it, help them find x in that triangle** - NOT in any algebra equation.\n" +
                "5. **ANALYZE THE DRAWING DYNAMICALLY** - Work with whatever shapes, labels, numbers, and variables are actually visible in the drawing.\n" +
                "═══════════════════════════════════════════════════════════════\n" : "") +
              "\n\n**EXAMPLE DRAWINGS**: If the student is stuck or would benefit from a visual example, you can provide a drawing example. " +
              "When suggesting an example, you can describe it clearly (e.g., 'Here's how to set up this problem: draw a right triangle with base 5 and height 3'). " +
              "For geometry problems, visual examples are especially helpful.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature,
        max_tokens: 250,
        stream: true,
      });

      // Collect full response for validation and storage
      let fullResponse = "";

      // Stream chunks
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      // Validate and store the complete response
      const tutorResponse = fullResponse.trim();

      if (!tutorResponse || tutorResponse.length < 5) {
        throw new Error("Received invalid response from tutor. Please try again.");
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
    } catch (error) {
      logger.error("Error in streaming message", {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      throw error;
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

