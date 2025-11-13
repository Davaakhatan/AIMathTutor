import { NextRequest, NextResponse } from "next/server";
import { createOpenAIClient } from "@/lib/openai";
import { logger } from "@/lib/logger";
import { ProblemType } from "@/types";

/**
 * AI-generated learning path structure
 */
interface AIGeneratedPath {
  targetConcepts: Array<{
    conceptId: string;
    conceptName: string;
    prerequisites: string[];
    difficulty: "elementary" | "middle school" | "high school" | "advanced";
    problemTypes: ProblemType[];
    description: string;
  }>;
  goal: string;
  estimatedSteps: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, conceptData, apiKey: clientApiKey } = body;

    if (!goal || typeof goal !== "string" || goal.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Goal is required" },
        { status: 400 }
      );
    }

    // Determine API key to use
    let apiKeyToUse: string | undefined;
    if (clientApiKey && typeof clientApiKey === "string" && clientApiKey.trim().length > 0) {
      apiKeyToUse = clientApiKey.trim();
    } else if (process.env.OPENAI_API_KEY) {
      apiKeyToUse = process.env.OPENAI_API_KEY.trim();
    }

    if (!apiKeyToUse) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env.local file or enter a valid API key in Settings.",
        },
        { status: 400 }
      );
    }

    // Get user's current mastery levels for context
    const masteryContext = conceptData?.concepts
      ? Object.values(conceptData.concepts)
          .map((c: any) => `${c.id}: ${c.masteryLevel}% mastery`)
          .join(", ")
      : "No prior mastery data";

    const client = createOpenAIClient(apiKeyToUse);

    const systemPrompt = `You are an expert math education AI that creates personalized learning paths for students.

Your task is to analyze a student's learning goal and generate a structured learning path with:
1. Target math concepts to learn
2. Prerequisites for each concept (what they need to know first)
3. Appropriate difficulty levels (elementary, middle school, high school, advanced)
4. Problem types (ALGEBRA, GEOMETRY, ARITHMETIC, WORD_PROBLEM, MULTI_STEP)
5. Learning order (prerequisites first)

Available concept IDs (use these exact IDs):
- linear_equations, quadratic_equations, factoring
- area_rectangle, area_triangle, area_circle, perimeter
- pythagorean_theorem, angles, volume
- fractions, decimals, percentages, ratios
- exponents, roots, slope

Available problem types: ALGEBRA, GEOMETRY, ARITHMETIC, WORD_PROBLEM, MULTI_STEP

Return a JSON object with this structure:
{
  "targetConcepts": [
    {
      "conceptId": "linear_equations",
      "conceptName": "Linear Equations",
      "prerequisites": ["fractions", "decimals"],
      "difficulty": "middle school",
      "problemTypes": ["ALGEBRA", "WORD_PROBLEM"],
      "description": "Learn to solve linear equations with one variable"
    }
  ],
  "goal": "The original goal",
  "estimatedSteps": 5
}

Important:
- Include ALL prerequisites (even prerequisites of prerequisites)
- Order concepts logically (prerequisites first)
- Use appropriate difficulty levels based on the concept
- Include 2-3 problem types per concept when relevant
- Make descriptions clear and motivating`;

    const userPrompt = `Student's goal: "${goal}"

Current mastery: ${masteryContext}

Generate a personalized learning path that:
1. Identifies all concepts needed to achieve this goal
2. Includes all prerequisites in the correct order
3. Adjusts difficulty based on the student's current mastery
4. Provides clear, step-by-step progression

Return ONLY valid JSON, no markdown formatting or code blocks.`;

    let response;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("OpenAI API call timed out after 15 seconds")), 15000);
      });

      const openaiPromise = client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      response = await Promise.race([openaiPromise, timeoutPromise]) as any;
    } catch (openaiError: any) {
      logger.error("OpenAI API call failed for learning path generation", {
        status: openaiError?.status,
        message: openaiError?.message,
      });

      if (openaiError?.status === 401) {
        throw new Error("Invalid API key. Please check your OpenAI API key.");
      }
      if (openaiError?.status === 429) {
        throw new Error("OpenAI API rate limit exceeded. Please try again later.");
      }
      if (openaiError?.message?.includes("insufficient_quota")) {
        throw new Error("OpenAI account quota exceeded. Please check your account credits.");
      }
      throw openaiError;
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    let aiPath: AIGeneratedPath;
    try {
      aiPath = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse AI response", { content, error: parseError });
      throw new Error("Invalid response format from AI");
    }

    // Validate and transform the response
    if (!aiPath.targetConcepts || !Array.isArray(aiPath.targetConcepts)) {
      throw new Error("Invalid learning path structure from AI");
    }

    logger.info("AI-generated learning path", {
      goal,
      conceptsCount: aiPath.targetConcepts.length,
    });

    return NextResponse.json({
      success: true,
      path: aiPath,
    });
  } catch (error: any) {
    logger.error("Error generating learning path with AI", {
      error: error?.message || error,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to generate learning path",
      },
      { status: 500 }
    );
  }
}

