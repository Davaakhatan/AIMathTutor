import { NextRequest, NextResponse } from "next/server";
import { dialogueManager } from "@/services/dialogueManager";
import { ParsedProblem } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const problem: ParsedProblem | undefined = body.problem;

    if (!problem) {
      return NextResponse.json(
        { success: false, error: "Problem is required" },
        { status: 400 }
      );
    }

    const session = dialogueManager.initializeConversation(problem);
    const history = dialogueManager.getHistory(session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      initialMessage: history.find((msg) => msg.role === "tutor"),
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create session",
      },
      { status: 500 }
    );
  }
}

