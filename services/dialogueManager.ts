import { openai } from "@/lib/openai";
import { contextManager } from "./contextManager";
import { socraticPromptEngine } from "./socraticPromptEngine";
import { responseValidator } from "./responseValidator";
import { ParsedProblem, Message, Session } from "@/types";
import { v4 as uuidv4 } from "uuid";

export class DialogueManager {
  /**
   * Initialize a conversation with a problem
   */
  initializeConversation(problem: ParsedProblem): Session {
    const session = contextManager.createSession(problem);

    // Add initial tutor message
    const initialMessage: Message = {
      id: uuidv4(),
      role: "tutor",
      content: socraticPromptEngine.buildInitialMessage(problem),
      timestamp: Date.now(),
    };

    contextManager.addMessage(session.id, initialMessage);

    return session;
  }

  /**
   * Process a user message and get tutor response
   */
  async processMessage(
    sessionId: string,
    userMessage: string
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
      context.stuckCount
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

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: socraticPromptEngine.generateSystemPrompt(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature,
        max_tokens: 250, // Slightly shorter for more focused responses
      });

      const tutorResponse = response.choices[0]?.message?.content?.trim();

      if (!tutorResponse) {
        throw new Error("No response from OpenAI");
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
      console.error("Error processing message:", error);
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

