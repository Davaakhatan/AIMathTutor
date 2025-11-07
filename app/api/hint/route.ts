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

    // Extract API key from request if provided (fallback when env var not available)
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
      logger.info("Using client-provided API key for hint", {
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
    logger.info("Hint API request received", {
      hasClientApiKey: !!clientApiKey,
      clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
      hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      hasApiKeyToUse: !!apiKeyToUse,
    });
    
    // Validate API key is available
    if (!apiKeyToUse) {
      logger.error("No API key available for hint generation", {
        hasClientApiKey: !!clientApiKey,
        clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      });
      return NextResponse.json(
        {
          error: "OpenAI API key is not configured. Please:\n1. Add OPENAI_API_KEY to your .env.local file\n2. Restart your dev server\n3. Or enter a valid API key in Settings (must start with 'sk-' or 'sk-proj-').",
        },
        { status: 500 }
      );
    }
    
    // Final validation of the key we're about to use
    if (!apiKeyToUse || !isValidApiKeyFormat(apiKeyToUse)) {
      logger.error("API key format is invalid for hint generation", {
        apiKeyPrefix: apiKeyToUse ? apiKeyToUse.substring(0, Math.min(10, apiKeyToUse.length)) : "undefined",
      });
      return NextResponse.json(
        {
          error: "Invalid API key format. OpenAI API keys must start with 'sk-' or 'sk-proj-'. Please check your API key in Settings or .env.local file.",
        },
        { status: 500 }
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

    // Use the determined API key (we know it's defined at this point due to validation above)
    const client = createOpenAIClient(apiKeyToUse!);

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
        clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
        hasApiKeyToUse: !!apiKeyToUse,
      });
      
      if (openaiError?.status === 401 || openaiError?.message?.includes("401") || openaiError?.message?.includes("unauthorized")) {
        throw new Error("Invalid API key. Please check your OpenAI API key in Settings or .env.local file.");
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

