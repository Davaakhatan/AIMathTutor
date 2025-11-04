/**
 * Utility functions for the AI Math Tutor application
 */

/**
 * Sanitize user input to prevent XSS and limit length
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ""); // Remove potential HTML tags
}

/**
 * Validate problem text input
 */
export function validateProblemText(text: string): { valid: boolean; error?: string } {
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: "Problem text cannot be empty" };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: "Problem text is too long. Please keep it under 500 characters." };
  }
  
  return { valid: true };
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes("timeout") || message.includes("abort")) {
      return "Request timed out. Please try again.";
    }
    
    if (message.includes("429") || message.includes("rate limit")) {
      return "Too many requests. Please wait a moment and try again.";
    }
    
    if (message.includes("401") || message.includes("api key") || message.includes("openai")) {
      return "API configuration error. Please check your OpenAI API key.";
    }
    
    if (message.includes("network") || message.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    
    return error.message;
  }
  
  return "An unexpected error occurred. Please try again.";
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    return (
      name === "aborterror" ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("429") ||
      message.includes("502") ||
      message.includes("503")
    );
  }
  
  return false;
}

/**
 * Delay function for retries (exponential backoff)
 */
export function delay(attempt: number): Promise<void> {
  const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

