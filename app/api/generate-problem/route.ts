import { NextRequest, NextResponse } from "next/server";
import { openai, createOpenAIClient } from "@/lib/openai";
import { logger } from "@/lib/logger";
import { ProblemType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, difficulty, conceptId, conceptName, apiKey: clientApiKey } = body;

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
      logger.info("Using client-provided API key for problem generation", {
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
    logger.info("Generate-problem API request received", {
      type,
      difficulty: difficultyPrompt,
      hasClientApiKey: !!clientApiKey,
      clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
      hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      hasApiKeyToUse: !!apiKeyToUse,
    });
    
    // Validate API key is available
    if (!apiKeyToUse) {
      logger.error("No API key available for problem generation", {
        hasClientApiKey: !!clientApiKey,
        clientApiKeyValid: clientApiKey ? isValidApiKeyFormat(clientApiKey) : false,
        hasEnvApiKey: !!process.env.OPENAI_API_KEY,
      });
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key is not configured. Please:\n1. Add OPENAI_API_KEY to your .env.local file\n2. Restart your dev server\n3. Or enter a valid API key in Settings (must start with 'sk-' or 'sk-proj-').",
        },
        { status: 500 }
      );
    }
    
    // Final validation of the key we're about to use
    if (!apiKeyToUse || !isValidApiKeyFormat(apiKeyToUse)) {
      logger.error("API key format is invalid for problem generation", {
        apiKeyPrefix: apiKeyToUse ? apiKeyToUse.substring(0, Math.min(10, apiKeyToUse.length)) : "undefined",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API key format. OpenAI API keys must start with 'sk-' or 'sk-proj-'. Please check your API key in Settings or .env.local file.",
        },
        { status: 500 }
      );
    }

    // Build concept-specific instruction if concept is provided
    let conceptInstruction = "";
    if (conceptId && conceptName) {
      const conceptExamples: Record<string, string> = {
        "decimals": "MUST involve decimal numbers (e.g., 3.5, 0.25, 2.75). Examples: 'Add 2.5 + 1.3' or 'Convert 0.75 to a fraction' or 'What is 4.2 × 0.5?'",
        "fractions": "MUST involve fractions (e.g., 1/2, 3/4, 2/3). Examples: 'Add 1/2 + 1/4' or 'Simplify 6/8' or 'What is 2/3 of 12?'",
        "area_rectangle": "MUST involve finding the area of a rectangle or square. Examples: 'Find the area of a rectangle with length 8 and width 5' or 'A square has side length 6. What is its area?'",
        "area_triangle": "MUST involve finding the area of a triangle. Examples: 'Find the area of a triangle with base 10 and height 6' or 'A triangle has base 8 and height 4. What is its area?'",
        "area_circle": "MUST involve finding the area of a circle. Examples: 'Find the area of a circle with radius 5' or 'A circle has radius 3. What is its area? (Use π = 3.14)'",
        "perimeter": "MUST involve finding the perimeter of a shape. Examples: 'Find the perimeter of a rectangle with length 8 and width 5' or 'A square has side length 6. What is its perimeter?'",
        "linear_equations": "MUST involve solving a linear equation with one variable. Examples: 'Solve for x: 2x + 5 = 13' or 'Find x if 3x - 7 = 14'",
        "quadratic_equations": "MUST involve solving a quadratic equation. Examples: 'Solve: x² + 5x + 6 = 0' or 'Find x: 2x² - 8x + 6 = 0'",
        "exponents": "MUST involve exponents or powers. Examples: 'What is 2³?' or 'Simplify 5² × 5³' or 'Evaluate 10²'",
        "percentages": "MUST involve percentages. Examples: 'What is 25% of 80?' or 'A shirt costs $50 and is 20% off. What is the sale price?'",
      };
      
      const example = conceptExamples[conceptId] || `MUST focus on ${conceptName.toLowerCase()}`;
      conceptInstruction = `\n\nCRITICAL: This problem is for learning "${conceptName}" (concept: ${conceptId}). The problem ${example}.`;
    }

    const systemPrompt = `You are a math problem generator. Generate a single, clear math problem of type ${type} appropriate for ${difficultyPrompt} level.

IMPORTANT: The difficulty level is ${difficultyPrompt}. You MUST generate a problem that matches this specific difficulty level.

${difficultyGuideline}${conceptInstruction}

Requirements:
- The problem MUST match the ${difficultyPrompt} difficulty level exactly
- ${conceptId ? `The problem MUST involve ${conceptName.toLowerCase()} to match the learning concept` : 'The problem should be solvable but appropriately challenging for the difficulty level'}
- Use clear, concise language
- Include all necessary information
- Return ONLY the problem statement, nothing else
- For equations, include the equation clearly
- For word problems, make them realistic and engaging`;

    // Use the determined API key (we know it's defined at this point due to validation above)
    const client = createOpenAIClient(apiKeyToUse!);

    let response;
    try {
      // Add timeout to OpenAI API call (10 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("OpenAI API call timed out after 10 seconds")), 10000);
      });
      
      const openaiPromise = client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a ${type} problem specifically for ${difficultyPrompt} level.${conceptId && conceptName ? ` The problem MUST focus on ${conceptName.toLowerCase()} (${conceptId}).` : ''} Make sure it is clearly ${difficultyPrompt} level difficulty, not easier or harder.`,
          },
        ],
        temperature: 0.9, // Higher temperature for more variety
        max_tokens: 200,
      });
      
      response = await Promise.race([openaiPromise, timeoutPromise]) as any;
    } catch (openaiError: any) {
      // Catch OpenAI SDK errors specifically
      logger.error("OpenAI API call failed for problem generation", {
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

