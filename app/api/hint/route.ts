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
      "Provide a very subtle hint that guides without giving away the answer. Frame it as a guiding question.",
      "Provide a slightly more specific hint that points toward the approach. Ask a question that helps them think.",
      "Provide a concrete hint about the method or operation needed, but frame it as a question.",
      "Provide detailed guidance on the next step, but still ask a question to guide them.",
    ];

    const systemPrompt = `You are a math tutor providing progressive hints using the Socratic method. The student is working on a ${problemType || "math"} problem. 
Your goal is to guide them with hints that get progressively more helpful, but NEVER give the direct answer, solution, or complete calculation.

CRITICAL RULES:
- NEVER show complete factorizations, derivations, or worked solutions
- NEVER provide step-by-step solutions or show calculations
- Guide them to discover the method themselves
- Always frame hints as guiding questions when possible

Hint Levels:
- Level 1: Very subtle, just get them thinking (e.g., "What information do we have?")
- Level 2: Slightly more specific, point to the approach (e.g., "What method might help here?")
- Level 3: Concrete hint about method/operation (e.g., "Consider what operations might simplify this")
- Level 4: Detailed guidance on next step, but still a question (e.g., "What should we do first?")

Keep hints concise (1-2 sentences max). Always frame as a guiding question when possible.`;

    const userPrompt = `Problem: ${problem.text}
${conversationHistory && conversationHistory.length > 0 ? `Recent conversation:\n${conversationHistory.map((m: any) => `${m.role}: ${m.content}`).join("\n")}` : ""}

Provide a level ${hintLevel} hint: ${hintPrompts[Math.min(hintLevel - 1, hintPrompts.length - 1)]}`;

    // Use client-provided API key if available, otherwise use default
    const client = clientApiKey 
      ? createOpenAIClient(clientApiKey)
      : openai;

    let response;
    try {
      response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150, // Increased for more detailed hints
      });
    } catch (openaiError: any) {
      logger.error("OpenAI API call failed for hint", {
        status: openaiError?.status,
        message: openaiError?.message,
        hasClientApiKey: !!clientApiKey,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      });
      
      if (openaiError?.status === 401 || openaiError?.message?.includes("401") || openaiError?.message?.includes("unauthorized")) {
        throw new Error("Invalid API key. Please check your OpenAI API key in Settings.");
      }
      if (openaiError?.status === 429 || openaiError?.message?.includes("429")) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      }
      if (openaiError?.message?.includes("insufficient_quota")) {
        throw new Error("OpenAI account quota exceeded. Please check your account credits.");
      }
      throw new Error(`OpenAI API error: ${openaiError?.message || String(openaiError)}`);
    }

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

