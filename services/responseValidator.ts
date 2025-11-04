import { ParsedProblem, Message } from "@/types";

export interface ValidationResult {
  isCorrect: boolean;
  isPartial: boolean;
  feedback?: string;
  confidence: number;
}

export class ResponseValidator {
  /**
   * Validate a student's response to a math problem
   * This is a simplified validator - in production, you'd use a math parser/solver
   */
  validateResponse(
    studentResponse: string,
    problem: ParsedProblem,
    conversationHistory: Message[]
  ): ValidationResult {
    const normalizedResponse = studentResponse.toLowerCase().trim();

    // Check for common correct indicators
    const correctIndicators = [
      "correct",
      "right",
      "yes",
      "that's it",
      "exactly",
      "got it",
    ];

    // Check for common incorrect indicators
    const incorrectIndicators = [
      "wrong",
      "no",
      "incorrect",
      "not sure",
      "don't know",
      "confused",
    ];

    // Check if response seems like a final answer
    const looksLikeAnswer = this.looksLikeFinalAnswer(normalizedResponse);

    // Check if response seems like a step or process
    const looksLikeStep = this.looksLikeStep(normalizedResponse);

    // Simple validation logic
    if (correctIndicators.some((indicator) => normalizedResponse.includes(indicator))) {
      return {
        isCorrect: true,
        isPartial: false,
        confidence: 0.7,
        feedback: "Great! You're on the right track.",
      };
    }

    if (incorrectIndicators.some((indicator) => normalizedResponse.includes(indicator))) {
      return {
        isCorrect: false,
        isPartial: false,
        confidence: 0.6,
        feedback: "That's okay, let's think through this step by step.",
      };
    }

    if (looksLikeAnswer) {
      // Could be correct or incorrect - we can't validate without solving
      return {
        isCorrect: false, // Assume needs verification
        isPartial: false,
        confidence: 0.5,
        feedback: "Interesting! Let's verify that answer together.",
      };
    }

    if (looksLikeStep) {
      return {
        isCorrect: true,
        isPartial: true,
        confidence: 0.7,
        feedback: "Good thinking! What's the next step?",
      };
    }

    // Default: assume engagement
    return {
      isCorrect: true,
      isPartial: true,
      confidence: 0.5,
      feedback: "I see you're thinking about it. Can you explain your reasoning?",
    };
  }

  /**
   * Check if response looks like a final numerical answer
   */
  private looksLikeFinalAnswer(response: string): boolean {
    // Check for numbers, especially with "x =", "answer is", etc.
    const answerPatterns = [
      /^x\s*=\s*-?\d+/,
      /^answer\s*(is|:)?\s*-?\d+/,
      /^-?\d+$/,
      /^the\s+answer\s+is/i,
    ];

    return answerPatterns.some((pattern) => pattern.test(response));
  }

  /**
   * Check if response looks like a step in the process
   */
  private looksLikeStep(response: string): boolean {
    const stepIndicators = [
      "first",
      "then",
      "next",
      "subtract",
      "add",
      "multiply",
      "divide",
      "isolate",
      "combine",
      "simplify",
    ];

    return stepIndicators.some((indicator) => response.includes(indicator));
  }

  /**
   * Detect if student is stuck based on response patterns
   */
  detectStuck(response: string): boolean {
    const stuckIndicators = [
      "don't know",
      "no idea",
      "confused",
      "stuck",
      "can't",
      "don't understand",
      "help",
      "?",
    ];

    const normalized = response.toLowerCase().trim();
    return (
      stuckIndicators.some((indicator) => normalized.includes(indicator)) ||
      normalized.length < 3
    );
  }
}

export const responseValidator = new ResponseValidator();

