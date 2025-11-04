/**
 * Utility functions for text processing and normalization
 */

/**
 * Normalize problem text by fixing spacing issues
 * Handles cases where text from OCR or parsing lacks proper spacing
 */
export function normalizeProblemText(text: string): string {
  if (!text || text.length === 0) return text;

  let normalized = text;
  
  // Preserve LaTeX expressions first (temporarily replace them)
  const latexPlaceholders: string[] = [];
  const latexRegex = /\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g;
  normalized = normalized.replace(latexRegex, (match) => {
    const placeholder = `__LATEX_${latexPlaceholders.length}__`;
    latexPlaceholders.push(match);
    return placeholder;
  });

  // Add spaces between letters and numbers (both directions)
  normalized = normalized
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2") // Letter before number
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2") // Number before letter
    // Add spaces between lowercase and uppercase letters
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Add spaces after punctuation if missing
    .replace(/([.,!?;:])([A-Za-z0-9])/g, "$1 $2")
    // Add spaces before punctuation if missing
    .replace(/([A-Za-z0-9])([.,!?;:])(?![0-9])/g, "$1 $2")
    // Normalize multiple spaces
    .replace(/\s+/g, " ")
    .trim();

  // Restore LaTeX expressions
  latexPlaceholders.forEach((latex, index) => {
    normalized = normalized.replace(`__LATEX_${index}__`, latex);
  });

  return normalized;
}

/**
 * Format text for better readability
 */
export function formatText(text: string): string {
  return normalizeProblemText(text)
    .replace(/\s+([.,!?])/g, "$1") // Remove space before punctuation
    .replace(/([.,!?])\s*([.,!?])/g, "$1"); // Remove duplicate punctuation
}

/**
 * Extract math expressions from text
 */
export function extractMathExpressions(text: string): string[] {
  const mathPatterns = [
    /[0-9]+\s*[+\-*/=<>]\s*[0-9]+/g, // Simple arithmetic
    /[a-z]\s*[+\-*/=<>]\s*[0-9]+/g, // Variables with operations
    /[0-9]+\s*[+\-*/=<>]\s*[a-z]/g, // Numbers with variables
    /\([^)]+\)/g, // Parentheses expressions
  ];

  const expressions: string[] = [];
  mathPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      expressions.push(...matches);
    }
  });

  // Remove duplicates using array methods instead of Set spread
  const uniqueExpressions: string[] = [];
  expressions.forEach((expr) => {
    if (!uniqueExpressions.includes(expr)) {
      uniqueExpressions.push(expr);
    }
  });

  return uniqueExpressions;
}

