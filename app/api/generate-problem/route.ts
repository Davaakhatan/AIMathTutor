import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { logger } from "@/lib/logger";
import { ProblemType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, difficulty } = body;

    if (!type || !Object.values(ProblemType).includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid problem type" },
        { status: 400 }
      );
    }

    const difficultyPrompt = difficulty || "middle school";

    const systemPrompt = `You are a math problem generator. Generate a single, clear math problem of type ${type} appropriate for ${difficultyPrompt} level. 
    
Requirements:
- The problem should be solvable but challenging
- Use clear, concise language
- Include all necessary information
- Return ONLY the problem statement, nothing else
- For equations, include the equation clearly
- For word problems, make them realistic and engaging`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a ${type} problem for ${difficultyPrompt} level.`,
        },
      ],
      temperature: 0.8, // More creative for variety
      max_tokens: 150,
    });

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

