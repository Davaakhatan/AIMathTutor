import { NextRequest, NextResponse } from "next/server";
import { openai, createOpenAIClient } from "@/lib/openai";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, hintLevel, conversationHistory, problemType, apiKey: clientApiKey } = body;

    if (!problem || !hintLevel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate progressive hint based on level
    const hintPrompts = [
      "Provide a very subtle hint that guides without giving away the answer.",
      "Provide a slightly more specific hint that points toward the approach.",
      "Provide a concrete hint about the method or operation needed.",
      "Provide a detailed hint that breaks down the next step clearly.",
    ];

    const systemPrompt = `You are a math tutor providing progressive hints. The student is working on a ${problemType || "math"} problem. 
Your goal is to guide them with hints that get progressively more helpful, but NEVER give the direct answer.

Hint Levels:
- Level 1: Very subtle, just get them thinking
- Level 2: Slightly more specific, point to the approach
- Level 3: Concrete hint about method/operation
- Level 4: Detailed breakdown of next step

Keep hints concise (1-2 sentences max).`;

    const userPrompt = `Problem: ${problem.text}
${conversationHistory && conversationHistory.length > 0 ? `Recent conversation:\n${conversationHistory.map((m: any) => `${m.role}: ${m.content}`).join("\n")}` : ""}

Provide a level ${hintLevel} hint: ${hintPrompts[Math.min(hintLevel - 1, hintPrompts.length - 1)]}`;

    // Use client-provided API key if available, otherwise use default
    const client = clientApiKey 
      ? createOpenAIClient(clientApiKey)
      : openai;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const hint = response.choices[0]?.message?.content?.trim();

    if (!hint) {
      throw new Error("Failed to generate hint");
    }

    return NextResponse.json({ hint });
  } catch (error) {
    logger.error("Error generating hint", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to generate hint. Please try again." },
      { status: 500 }
    );
  }
}

