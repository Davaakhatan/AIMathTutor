import { NextRequest, NextResponse } from "next/server";
import { dialogueManager } from "@/services/dialogueManager";
import { contextManager } from "@/services/contextManager";
import { ChatRequest, ChatResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    // If this is the first message and includes a problem, initialize conversation
    if (body.problem) {
      // When initializing, we don't need sessionId or message
      const session = dialogueManager.initializeConversation(body.problem);
      const history = dialogueManager.getHistory(session.id);

      // Return the initial tutor message
      const initialMessage = history.find((msg) => msg.role === "tutor");
      
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

    // Process user message
    const tutorResponse = await dialogueManager.processMessage(
      body.sessionId,
      body.message
    );

    return NextResponse.json({
      success: true,
      response: {
        text: tutorResponse.content,
        timestamp: tutorResponse.timestamp,
      },
    } as ChatResponse);
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process message",
      } as ChatResponse,
      { status: 500 }
    );
  }
}

