import { openai, createOpenAIClient } from "@/lib/openai";
import { ParsedProblem, ProblemType } from "@/types";
import { logger } from "@/lib/logger";

export class ProblemParser {
  /**
   * Parse problem from text input
   */
  async parseText(text: string, clientApiKey?: string): Promise<ParsedProblem> {
    // Clean and validate text
    const cleanedText = text.trim();
    
    if (!cleanedText) {
      throw new Error("Problem text cannot be empty");
    }

    if (cleanedText.length > 500) {
      throw new Error("Problem text is too long. Maximum 500 characters.");
    }

    // Try to identify problem type
    const type = this.identifyProblemType(cleanedText);
    
    logger.debug("Problem parsed", { type, length: cleanedText.length });

    return {
      text: cleanedText,
      type,
      confidence: 1.0, // Text input is always 100% confident
    };
  }

  /**
   * Parse problem from image using OpenAI Vision API
   */
  async parseImage(imageBase64: string, clientApiKey?: string): Promise<ParsedProblem> {
    // Validate base64 string
    if (!imageBase64 || imageBase64.length === 0) {
      throw new Error("Image data is empty");
    }

    // Basic base64 validation
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(imageBase64)) {
      throw new Error("Invalid image data format");
    }

    // Check reasonable size (max ~20MB for base64)
    if (imageBase64.length > 20 * 1024 * 1024) {
      throw new Error("Image is too large. Maximum size is 20MB.");
    }

    try {
      logger.debug("Parsing image", { size: imageBase64.length });

      // Use client-provided API key if available, otherwise use default
      const client = clientApiKey 
        ? createOpenAIClient(clientApiKey)
        : openai;

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a math problem parser. Extract the math problem text from the image. " +
              "Return ONLY the problem statement, nothing else. If there are equations, use LaTeX notation. " +
              "Be precise and include all relevant numbers and operations.",
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

      if (extractedText.length > 1000) {
        logger.warn("Extracted text is very long", { length: extractedText.length });
      }

      // Identify problem type
      const type = this.identifyProblemType(extractedText);

      logger.debug("Image parsed successfully", { type, length: extractedText.length });

      return {
        text: extractedText,
        type,
        confidence: 0.9, // Vision API is generally reliable but not 100%
      };
    } catch (error) {
      logger.error("Error parsing image", { 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
      
      if (error instanceof Error) {
        // Check for specific OpenAI errors
        if (error.message.includes("API key") || error.message.includes("401")) {
          throw new Error("OpenAI API configuration error. Please check your API key.");
        }
        if (error.message.includes("rate limit") || error.message.includes("429")) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (error.message.includes("invalid_image")) {
          throw new Error("Invalid image format. Please upload a JPG or PNG image.");
        }
      }
      
      throw new Error(
        `Failed to parse image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Identify problem type from text
   * Improved detection with better pattern matching
   */
  private identifyProblemType(text: string): ProblemType {
    const lowerText = text.toLowerCase();
    const trimmedText = text.trim();

    // Check for quadratic patterns (before general algebra)
    if (
      /x\^2|x²|x\*\*2|quadratic|ax\^2|ax²/.test(lowerText) ||
      /x\s*[+\-]\s*x|x\s*\*\s*x/.test(text)
    ) {
      // Still classify as algebra, but could be enhanced later
      return ProblemType.ALGEBRA;
    }

    // Check for algebra patterns (variables, equations, solve for)
    if (
      /[x-z]\s*[+\-*/=<>]|solve\s+for|equation|variable|isolate/.test(lowerText) ||
      /[a-z]\s*=\s*/.test(lowerText)
    ) {
      return ProblemType.ALGEBRA;
    }

    // Check for geometry patterns (more comprehensive)
    if (
      /area|perimeter|volume|surface\s+area|angle|triangle|circle|rectangle|square|radius|diameter|circumference|height|width|length|base/.test(
        lowerText
      ) ||
      /degrees?|°|radians?|π|pi/.test(lowerText)
    ) {
      return ProblemType.GEOMETRY;
    }

    // Check for word problem patterns (more specific)
    if (
      (/how\s+many|how\s+much|what|if|when|then|total|each|per|percent|percentage|ratio|proportion/.test(lowerText) ||
       /cost|price|discount|sale|tax|tip|interest/.test(lowerText)) &&
      /[0-9]/.test(text)
    ) {
      return ProblemType.WORD_PROBLEM;
    }

    // Check for multi-step (contains multiple operations, parentheses, or explicit step indicators)
    const hasMultipleOps = (text.match(/(\+|\-|\*|\/)/g) || []).length >= 2;
    const hasParentheses = /\(|\)/.test(text);
    const hasStepKeywords = /step|first|then|next|finally|and\s+then|after|before/.test(lowerText);
    
    if (hasStepKeywords || (hasMultipleOps && hasParentheses)) {
      return ProblemType.MULTI_STEP;
    }

    // Check for simple arithmetic (only numbers and basic operations)
    if (/^[\d\s+\-*/().,]+$/.test(trimmedText.replace(/\s/g, "")) && 
        !/[a-z]/.test(lowerText)) {
      return ProblemType.ARITHMETIC;
    }

    return ProblemType.UNKNOWN;
  }
}

export const problemParser = new ProblemParser();

