import { openai } from "@/lib/openai";
import { ParsedProblem, ProblemType } from "@/types";

export class ProblemParser {
  /**
   * Parse problem from text input
   */
  async parseText(text: string): Promise<ParsedProblem> {
    // Clean and validate text
    const cleanedText = text.trim();
    
    if (!cleanedText) {
      throw new Error("Problem text cannot be empty");
    }

    // Try to identify problem type
    const type = this.identifyProblemType(cleanedText);

    return {
      text: cleanedText,
      type,
      confidence: 1.0, // Text input is always 100% confident
    };
  }

  /**
   * Parse problem from image using OpenAI Vision API
   */
  async parseImage(imageBase64: string): Promise<ParsedProblem> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a math problem parser. Extract the math problem text from the image. " +
              "Return ONLY the problem statement, nothing else. If there are equations, use LaTeX notation.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Extract the math problem from this image. Return only the problem statement.",
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const extractedText = response.choices[0]?.message?.content?.trim();

      if (!extractedText) {
        throw new Error("Failed to extract problem from image");
      }

      // Identify problem type
      const type = this.identifyProblemType(extractedText);

      return {
        text: extractedText,
        type,
        confidence: 0.9, // Vision API is generally reliable but not 100%
      };
    } catch (error) {
      console.error("Error parsing image:", error);
      throw new Error(
        `Failed to parse image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Identify problem type from text
   */
  private identifyProblemType(text: string): ProblemType {
    const lowerText = text.toLowerCase();

    // Check for algebra patterns
    if (
      /[x-z]\s*[+\-*/=]|solve for|equation|variable/.test(lowerText)
    ) {
      return ProblemType.ALGEBRA;
    }

    // Check for geometry patterns
    if (
      /area|perimeter|volume|angle|triangle|circle|rectangle|square|radius|diameter/.test(
        lowerText
      )
    ) {
      return ProblemType.GEOMETRY;
    }

    // Check for word problem patterns
    if (
      /how many|how much|what|if|when|then|total|each|per/.test(lowerText) &&
      /[0-9]/.test(text)
    ) {
      return ProblemType.WORD_PROBLEM;
    }

    // Check for multi-step (contains multiple operations or steps)
    if (
      /step|first|then|next|finally|and then/.test(lowerText) ||
      (/(\+|\-|\*|\/|\(|\))/g.test(text) &&
        (text.match(/(\+|\-|\*|\/)/g) || []).length >= 2)
    ) {
      return ProblemType.MULTI_STEP;
    }

    // Check for simple arithmetic
    if (/^[\d\s+\-*/().]+$/.test(text.replace(/\s/g, ""))) {
      return ProblemType.ARITHMETIC;
    }

    return ProblemType.UNKNOWN;
  }
}

export const problemParser = new ProblemParser();

