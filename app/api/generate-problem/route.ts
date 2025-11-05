import { NextRequest, NextResponse } from "next/server";
import { openai, createOpenAIClient } from "@/lib/openai";
import { logger } from "@/lib/logger";
import { ProblemType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, difficulty, apiKey: clientApiKey } = body;

    if (!type || !Object.values(ProblemType).includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid problem type" },
        { status: 400 }
      );
    }

    const difficultyPrompt = difficulty || "middle school";
    
    // Log the difficulty being used for debugging
    logger.info("Generating problem with difficulty", { difficulty: difficultyPrompt, receivedDifficulty: difficulty });

    // Define difficulty-specific guidelines
    const difficultyGuidelines: Record<string, string> = {
      "elementary": "Elementary level (K-5): Use simple numbers (1-100), basic operations (addition, subtraction, multiplication, division), simple word problems with everyday objects. Examples: 'Sarah has 5 apples and gives away 2. How many are left?' or 'What is 7 × 8?'",
      "middle school": "Middle school level (6-8): Use moderate numbers, introduce variables, basic algebra, fractions, percentages. Examples: 'Solve for x: 2x + 5 = 13' or 'What is 25% of 80?'",
      "high school": "High school level (9-12): Use complex equations, advanced algebra, trigonometry basics, quadratic equations, word problems with multiple steps. Examples: 'Solve: x² + 5x + 6 = 0' or 'Find the area of a triangle with sides 5, 6, and 7'",
      "advanced": "Advanced level (College/AP): Use calculus concepts, complex algebra, abstract problems, multi-step proofs, advanced word problems. Examples: 'Find the derivative of f(x) = x³ + 2x² - 5x' or 'Solve the system: 2x + 3y = 7, 4x - y = 1'"
    };

    const difficultyGuideline = difficultyGuidelines[difficultyPrompt.toLowerCase()] || difficultyGuidelines["middle school"];

    const systemPrompt = `You are a math problem generator. Generate a single, clear math problem of type ${type} appropriate for ${difficultyPrompt} level.

IMPORTANT: The difficulty level is ${difficultyPrompt}. You MUST generate a problem that matches this specific difficulty level.

${difficultyGuideline}

Requirements:
- The problem MUST match the ${difficultyPrompt} difficulty level exactly
- The problem should be solvable but appropriately challenging for ${difficultyPrompt} level
- Use clear, concise language
- Include all necessary information
- Return ONLY the problem statement, nothing else
- For equations, include the equation clearly
- For word problems, make them realistic and engaging`;

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
          {
            role: "user",
            content: `Generate a ${type} problem specifically for ${difficultyPrompt} level. Make sure it is clearly ${difficultyPrompt} level difficulty, not easier or harder.`,
          },
        ],
        temperature: 0.9, // Higher temperature for more variety
        max_tokens: 200,
      });
    } catch (openaiError: any) {
      // Catch OpenAI SDK errors specifically
      if (openaiError?.status === 401 || openaiError?.message?.includes("401") || openaiError?.message?.includes("unauthorized")) {
        logger.error("OpenAI authentication error", { 
          hasClientApiKey: !!clientApiKey,
          hasEnvApiKey: !!process.env.OPENAI_API_KEY,
          errorStatus: openaiError?.status 
        });
        throw new Error("Invalid API key. Please check your OpenAI API key in Settings. The key may be incorrect, expired, or revoked.");
      }
      if (openaiError?.status === 429 || openaiError?.message?.includes("429")) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      }
      if (openaiError?.message?.includes("insufficient_quota")) {
        throw new Error("OpenAI account quota exceeded. Please check your OpenAI account credits.");
      }
      // Re-throw with more context
      throw new Error(`OpenAI API error: ${openaiError?.message || String(openaiError)}`);
    }

    const problemText = response.choices[0]?.message?.content?.trim();

    if (!problemText) {
      throw new Error("Failed to generate problem");
    }

    logger.info("Problem generated", { type, difficulty });

    return NextResponse.json({
      success: true,
      problem: {
        text: problemText,
        type: type,
        confidence: 0.9,
      },
    });
  } catch (error) {
    logger.error("Error generating problem:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate problem",
      },
      { status: 500 }
    );
  }
}

