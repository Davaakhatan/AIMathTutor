/**
 * Utility functions for text processing and normalization
 */

/**
 * Common English words that frequently appear in math problems
 * Used for intelligent word splitting
 */
const COMMON_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from',
  'has', 'have', 'he', 'her', 'hers', 'him', 'his', 'how', 'i', 'if', 'in',
  'is', 'it', 'its', 'many', 'much', 'my', 'of', 'on', 'or', 'she', 'that',
  'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'will',
  'with', 'would', 'you', 'your',
  // Math-specific words
  'all', 'each', 'buy', 'cost', 'costs', 'total', 'pack', 'packs', 'come',
  'comes', 'party', 'hats', 'hat', 'balloons', 'balloon', 'needs', 'needed',
  'need', 'friends', 'friend', 'enough', 'will', 'how', 'much', 'many',
  'containing', 'contains', 'contain', 'chocolates', 'chocolate', 'toys',
  'toy', 'stickers', 'sticker', 'sheets', 'sheet', 'prepare', 'preparing',
  'spend', 'spent', 'spending', 'spends', 'planning', 'plans', 'plan',
  'expects', 'expect', 'expected', 'attending', 'attend', 'attends',
  'wants', 'want', 'wanted', 'give', 'gives', 'giving', 'gave',
  // Geometry and measurement words
  'meters', 'meter', 'feet', 'foot', 'inches', 'inch', 'length', 'width',
  'height', 'area', 'perimeter', 'volume', 'field', 'rectangular', 'rectangle',
  'divide', 'dividing', 'divided', 'calculate', 'determine', 'purchase', 'build',
  'building', 'fence', 'fencing', 'parallel', 'smaller', 'equal', 'sized'
]);

/**
 * Check if a word is a valid English word (basic heuristic)
 * This prevents splitting legitimate words
 */
function isValidWord(word: string): boolean {
  if (word.length <= 2) return true; // Short words are usually valid
  
  // Check if it's a common word
  if (COMMON_WORDS.has(word.toLowerCase())) return true;
  
  // Check if it looks like a valid word (has vowels, reasonable length)
  const hasVowels = /[aeiouyAEIOUY]/.test(word);
  const reasonableLength = word.length >= 2 && word.length <= 20;
  
  // If it has vowels and reasonable length, likely a valid word
  if (hasVowels && reasonableLength) return true;
  
  return false;
}

/**
 * Split concatenated words intelligently
 * Only splits when we can identify clear word boundaries
 * NEVER splits words character by character
 */
function splitConcatenatedWords(text: string): string {
  // Split on uppercase letters first (camelCase)
  let split = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  const words = split.split(/\s+/);
  const result: string[] = [];
  
  for (const word of words) {
    // Short words are usually fine
    if (word.length <= 3) {
      result.push(word);
      continue;
    }
    
    // If word looks valid, keep it as-is
    if (isValidWord(word)) {
      result.push(word);
      continue;
    }
    
    // Only try to split if word is very long (likely concatenated) and all lowercase
    if (word.length > 15 && /^[a-z]+$/i.test(word)) {
      let remaining = word.toLowerCase();
      const parts: string[] = [];
      let attempts = 0;
      const maxAttempts = 10; // Prevent infinite loops
      
      // Try to find common words from the start
      while (remaining.length > 0 && attempts < maxAttempts) {
        attempts++;
        let found = false;
        
        // Try longer words first (more specific)
        const sortedWords = Array.from(COMMON_WORDS).sort((a, b) => b.length - a.length);
        
        for (const commonWord of sortedWords) {
          if (remaining.startsWith(commonWord) && commonWord.length >= 3) {
            parts.push(commonWord);
            remaining = remaining.slice(commonWord.length);
            found = true;
            break;
          }
        }
        
        if (!found) {
          // If no match found and remaining is still long, try to find a valid word
          // by looking for the longest match that starts with remaining
          let longestMatch = '';
          for (const commonWord of sortedWords) {
            if (remaining.startsWith(commonWord) && commonWord.length > longestMatch.length) {
              longestMatch = commonWord;
            }
          }
          
          if (longestMatch.length >= 3) {
            parts.push(longestMatch);
            remaining = remaining.slice(longestMatch.length);
            found = true;
          } else {
            // If we can't find a match, keep the rest as one word
            // This prevents character-by-character splitting
            if (remaining.length > 0) {
              parts.push(remaining);
            }
            break;
          }
        }
      }
      
      // Only split if we found multiple meaningful parts
      if (parts.length > 1 && parts.every(p => p.length >= 3)) {
        result.push(...parts);
      } else {
        // Keep original word if splitting didn't produce good results
        result.push(word);
      }
    } else {
      // Keep word as-is if it doesn't meet splitting criteria
      result.push(word);
    }
  }
  
  return result.join(' ');
}

/**
 * Normalize problem text by fixing spacing issues
 * Handles cases where text from OCR or parsing lacks proper spacing
 * This version is more conservative and preserves legitimate words
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

  // Preserve bold/italic markers temporarily
  const boldPlaceholders: string[] = [];
  normalized = normalized.replace(/\*\*([^*]+)\*\*/g, (match, content) => {
    const placeholder = `__BOLD_${boldPlaceholders.length}__`;
    boldPlaceholders.push(match);
    return placeholder;
  });

  // Step 1: Add spaces between numbers and letters (both directions)
  // But be careful - only if there's no space already
  normalized = normalized
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2") // Number before letter
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2"); // Letter before number

  // Step 2: Split on uppercase letters (camelCase) - only if both parts look valid
  normalized = normalized.replace(/([a-z])([A-Z])/g, (match, p1, p2) => {
    // Only split if both parts are meaningful (at least 2 chars each)
    if (p1.length >= 2 && p2.length >= 2) {
      return "$1 $2";
    }
    return match;
  });

  // Step 3: Fix common concatenated patterns - but be more conservative
  // Only fix obvious cases where we're sure it's a concatenation
  const safePatterns = [
    // Question words - only if followed by common words
    /(how)(much|many|will|can|should|would|does|do|did|is|are|was|were)\b/gi,
    /(what)(will|can|should|would|does|do|did|is|are|was|were|for|the|with|from)\b/gi,
    /(when)(will|can|should|would|does|do|did|is|are|was|were|the|they)\b/gi,
    /(where)(will|can|should|would|does|do|did|is|are|was|were|the|they)\b/gi,
    // Common verb patterns - only if followed by pronouns/common words
    /(will)(it|he|she|they|we|you|cost|costs|need|needs|buy|take|be|have)\b/gi,
    /(can)(it|he|she|they|we|you|buy|cost|costs|need|needs|take|be|have)\b/gi,
    /(does)(it|he|she|cost|costs|need|needs|take|contain)\b/gi,
    /(do)(it|they|we|you|cost|costs|need|needs|take|contain)\b/gi,
    // Cost/price related - only if followed by pronouns/prepositions
    /(cost)(her|him|them|us|it|for|to|of|the|all)\b/gi,
    /(costs)(her|him|them|us|it|for|to|of|the|all)\b/gi,
    /(buy)(enough|all|for|the|to|her|him|them|it)\b/gi,
    /(bought)(enough|all|for|the|to|her|him|them|it)\b/gi,
    // Contain/containing - only if followed by numbers/prepositions
    /(containing)(10|15|20|25|6|8|for|the|to|her|him|them|it)\b/gi,
    /(contain)(10|15|20|25|6|8|for|the|to|her|him|them|it)\b/gi,
    /(contains)(10|15|20|25|6|8|for|the|to|her|him|them|it)\b/gi,
  ];

  // Apply safe patterns only once (not multiple times)
  safePatterns.forEach(pattern => {
    normalized = normalized.replace(pattern, (match, p1, p2) => {
      // Only split if both parts are meaningful and likely words
      if (p1 && p2 && p1.length >= 2 && p2.length >= 2) {
        return `${p1} ${p2}`;
      }
      return match;
    });
  });

  // Step 4: Split concatenated words (but only if really needed)
  normalized = splitConcatenatedWords(normalized);

  // Step 5: Fix spacing around punctuation
  normalized = normalized.replace(/\s+([:!?.,;])/g, "$1"); // Remove space before punctuation
  normalized = normalized.replace(/\s*:\s*/g, ": "); // Ensure single space after colons
  normalized = normalized.replace(/([!?])\s*/g, "$1 "); // Ensure space after ! and ?
  normalized = normalized.replace(/([0-9])\s+([?])/g, "$1$2"); // Fix "3 ?" -> "3?"
  normalized = normalized.replace(/([.,!?;:])(?![0-9])(?![ ])([A-Za-z0-9])/g, "$1 $2"); // Add space after punctuation if missing

  // Step 6: Fix spacing around question numbers (e.g., "?2." -> "? 2.")
  normalized = normalized.replace(/([?])([0-9])/g, "$1 $2");
  normalized = normalized.replace(/([0-9])([\.])([A-Za-z])/g, "$1$2 $3"); // Fix "1.How" -> "1. How"

  // Step 7: Normalize multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Step 8: Final cleanup - remove space before punctuation at end of sentences
  normalized = normalized.replace(/\s+([.!?])$/g, "$1");
  normalized = normalized.replace(/\s+([:!?.,;])/g, "$1"); // Catch any remaining

  // Restore bold markers
  boldPlaceholders.forEach((bold, index) => {
    normalized = normalized.replace(`__BOLD_${index}__`, bold);
  });

  // Restore LaTeX expressions
  latexPlaceholders.forEach((latex, index) => {
    normalized = normalized.replace(`__LATEX_${index}__`, latex);
  });

  return normalized;
}

/**
 * Format text for better readability
 * Additional formatting on top of normalization
 */
export function formatText(text: string): string {
  return normalizeProblemText(text)
    .replace(/\s+([.,!?])/g, "$1") // Remove space before punctuation
    .replace(/([.,!?])\s*([.,!?])/g, "$1") // Remove duplicate punctuation
    .replace(/\s+:/g, ":") // Remove space before colons
    .replace(/:\s+/g, ": "); // Ensure single space after colons
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
