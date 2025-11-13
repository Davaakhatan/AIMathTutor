import { ParsedProblem, Message } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Math concepts that can be tracked
 */
export interface MathConcept {
  id: string;
  name: string;
  category: string; // "algebra", "geometry", "arithmetic", etc.
  masteryLevel: number; // 0-100
  problemsAttempted: number;
  problemsSolved: number;
  lastPracticed: number; // timestamp
  averageHints: number; // Average hints needed
  averageTime: number; // Average time in minutes
}

/**
 * Concept tracking data structure
 */
export interface ConceptTrackingData {
  concepts: Record<string, MathConcept>;
  lastUpdated: number;
}

/**
 * Concept patterns for detection
 */
const CONCEPT_PATTERNS: Record<string, { patterns: RegExp[]; category: string }> = {
  "linear_equations": {
    patterns: [
      /ax\s*[+\-]\s*b\s*=\s*c/i,
      /solve\s+for\s+x/i,
      /isolate\s+the\s+variable/i,
      /\d+x\s*[+\-]?\s*\d+\s*=\s*\d+/i,
    ],
    category: "algebra",
  },
  "quadratic_equations": {
    patterns: [
      /x\^2|x²|x\*\*2|quadratic|ax\^2|ax²/i,
      /factoring|quadratic\s+formula/i,
    ],
    category: "algebra",
  },
  "factoring": {
    patterns: [
      /factoring|factor|GCF|greatest\s+common\s+factor/i,
      /(x\s*[+\-]\s*\d+)\s*\(/i,
    ],
    category: "algebra",
  },
  "pythagorean_theorem": {
    patterns: [
      /pythagorean|a\^2\s*\+\s*b\^2|c\^2|hypotenuse/i,
      /right\s+triangle|right\s+angle/i,
    ],
    category: "geometry",
  },
  "area_circle": {
    patterns: [
      /area\s+of\s+(circle|circle's?)/i,
      /πr\^2|πr²|pi\s*r\s*\^2/i,
      /radius.*area|area.*radius/i,
      // Match circle area problems even when "circle" isn't explicitly mentioned
      // Look for area calculations that result in decimal values (common for π calculations)
      /area.*(?:is|equals?|=\s*)\s*\d+\.\d+/i,
      /(?:is|equals?|=\s*)\s*\d+\.\d+\s+square\s+(?:meters?|feet|units?)/i,
      // Match problems mentioning π (pi) in the solution or problem
      /(?:using|with|π|pi).*area|area.*(?:using|with|π|pi)/i,
      // Match garden/field problems that mention area with decimal results (likely circles)
      /(?:garden|field|plot|region|circle).*area.*\d+\.\d+/i,
      /area.*(?:garden|field|plot|region).*\d+\.\d+/i,
    ],
    category: "geometry",
  },
  "area_triangle": {
    patterns: [
      /area\s+of\s+(triangle|triangle's?)/i,
      /(1\/2|0\.5)\s*\*\s*base\s*\*\s*height|base\s*\*\s*height\s*\/\s*2/i,
    ],
    category: "geometry",
  },
  "area_rectangle": {
    patterns: [
      /area\s+of\s+(?:the\s+)?(rectangle|square|rect)/i,
      /(?:the\s+)?(rectangle|square|rect).*area|area.*(?:the\s+)?(rectangle|square|rect)/i,
      /length\s*\*\s*width|width\s*\*\s*length/i,
      // Match rectangle/square/rect in geometry context - for perimeter, length, width problems
      /(?:a|the)\s+(?:rectangular|rectangle|square)\s+(?:garden|field|room|box|shape|figure|object)/i,
      /(?:rectangular|rectangle|square)\s+(?:has|is|with|measures|length|width|perimeter)/i,
      /(?:length|width|long|wide).*(?:rectangular|rectangle|square)|(?:rectangular|rectangle|square).*(?:length|width|long|wide)/i,
    ],
    category: "geometry",
  },
  "perimeter": {
    patterns: [
      /perimeter|circumference/i,
      /sum\s+of\s+(sides|all\s+sides)/i,
    ],
    category: "geometry",
  },
  "angles": {
    patterns: [
      /angle|degrees?|°|radians?/i,
      /supplementary|complementary|vertical\s+angles/i,
      /triangle.*angle|angle.*triangle/i,
    ],
    category: "geometry",
  },
  "fractions": {
    patterns: [
      /\d+\/\d+|fraction/i,
      /numerator|denominator/i,
      /simplify\s+fraction|reduce\s+fraction/i,
    ],
    category: "arithmetic",
  },
  "decimals": {
    patterns: [
      /\d+\.\d+/,
      /decimal/i,
      /convert.*decimal|decimal.*convert/i,
    ],
    category: "arithmetic",
  },
  "percentages": {
    patterns: [
      /percent|%|percentage/i,
      /\d+%/,
      /discount|tax|tip|interest.*percent/i,
    ],
    category: "arithmetic",
  },
  "ratios": {
    patterns: [
      /ratio|proportion/i,
      /\d+\s*:\s*\d+/,
      /scale|scaling/i,
    ],
    category: "arithmetic",
  },
  "exponents": {
    patterns: [
      /x\^n|x\^2|x\^3|exponent|power/i,
      /\d+\^\d+/,
      /squared|cubed/i,
    ],
    category: "algebra",
  },
  "roots": {
    patterns: [
      /√|square\s+root|sqrt|cube\s+root/i,
      /radical/i,
    ],
    category: "algebra",
  },
  "slope": {
    patterns: [
      /slope|y\s*=\s*mx\s*\+\s*b|linear\s+function/i,
      /rise\s+over\s+run|m\s*=\s*\(y2\s*-\s*y1\)/i,
    ],
    category: "algebra",
  },
  "volume": {
    patterns: [
      /volume\s+of/i,
      /cubic|cube|length\s*\*\s*width\s*\*\s*height/i,
    ],
    category: "geometry",
  },
};

/**
 * Extract concepts from a problem
 */
export function extractConcepts(problem: ParsedProblem): string[] {
  const detectedConcepts: string[] = [];
  const problemText = problem.text.toLowerCase();

  logger.debug("Extracting concepts from problem", {
    problemText: problem.text?.substring(0, 100),
    problemType: problem.type,
  });

  // Check each concept pattern
  for (const [conceptId, { patterns }] of Object.entries(CONCEPT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(problemText)) {
        detectedConcepts.push(conceptId);
        logger.debug("Concept matched", { conceptId, pattern: pattern.toString() });
        break; // Found this concept, no need to check more patterns
      }
    }
  }

  // Also add problem type as a concept (but only if it's a valid concept ID)
  // Don't add generic types like "geometry" or "algebra" as they're too broad
  // Only add if it matches a known concept pattern
  if (problem.type) {
    const typeLower = problem.type.toLowerCase();
    // Only add if it's a specific concept, not a generic category
    if (CONCEPT_PATTERNS[typeLower]) {
      detectedConcepts.push(typeLower);
    }
  }

  logger.debug("Extracted concepts", {
    concepts: detectedConcepts,
    count: detectedConcepts.length,
  });

  return [...new Set(detectedConcepts)]; // Remove duplicates
}

/**
 * Update concept mastery based on problem completion
 */
export function updateConceptMastery(
  conceptId: string,
  wasSolved: boolean,
  hintsUsed: number = 0,
  timeSpent: number = 0, // in minutes
  existingData?: ConceptTrackingData
): MathConcept {
  const data = existingData?.concepts?.[conceptId] || {
    id: conceptId,
    name: formatConceptName(conceptId),
    category: CONCEPT_PATTERNS[conceptId]?.category || "general",
    masteryLevel: 50, // Start at 50% for new concepts
    problemsAttempted: 0,
    problemsSolved: 0,
    lastPracticed: Date.now(),
    averageHints: 0,
    averageTime: 0,
  };

  // Update statistics
  const newAttempts = data.problemsAttempted + 1;
  const newSolved = data.problemsSolved + (wasSolved ? 1 : 0);
  const newAverageHints = (data.averageHints * data.problemsAttempted + hintsUsed) / newAttempts;
  const newAverageTime = timeSpent > 0 
    ? (data.averageTime * data.problemsAttempted + timeSpent) / newAttempts
    : data.averageTime;

  // Calculate mastery level (0-100)
  // Based on: solve rate (70%), hint usage (20%), time efficiency (10%)
  const solveRate = (newSolved / newAttempts) * 100;
  const hintScore = Math.max(0, 100 - (newAverageHints * 20)); // Penalize high hint usage
  const timeScore = timeSpent > 0 
    ? Math.max(0, 100 - (newAverageTime * 2)) // Penalize very slow solving
    : 50; // Neutral if no time data

  const masteryLevel = Math.min(100, Math.max(0, 
    solveRate * 0.7 + hintScore * 0.2 + timeScore * 0.1
  ));

  return {
    ...data,
    masteryLevel: Math.round(masteryLevel),
    problemsAttempted: newAttempts,
    problemsSolved: newSolved,
    lastPracticed: Date.now(),
    averageHints: Math.round(newAverageHints * 10) / 10,
    averageTime: Math.round(newAverageTime * 10) / 10,
  };
}

/**
 * Format concept ID to readable name
 */
function formatConceptName(conceptId: string): string {
  return conceptId
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get all tracked concepts
 */
export function getAllConcepts(data?: ConceptTrackingData): MathConcept[] {
  if (!data?.concepts) return [];
  return Object.values(data.concepts).sort((a, b) => {
    // Sort by mastery level (lowest first - needs practice)
    return a.masteryLevel - b.masteryLevel;
  });
}

/**
 * Get concepts by category
 */
export function getConceptsByCategory(data?: ConceptTrackingData): Record<string, MathConcept[]> {
  const concepts = getAllConcepts(data);
  const byCategory: Record<string, MathConcept[]> = {};

  concepts.forEach(concept => {
    if (!byCategory[concept.category]) {
      byCategory[concept.category] = [];
    }
    byCategory[concept.category].push(concept);
  });

  return byCategory;
}

/**
 * Get concepts that need practice (low mastery)
 */
export function getConceptsNeedingPractice(data?: ConceptTrackingData, threshold: number = 70): MathConcept[] {
  return getAllConcepts(data).filter(concept => concept.masteryLevel < threshold);
}

/**
 * Concept relationship map - defines which concepts are actually related
 * This ensures Related Concepts shows only relevant concepts, not just same category
 */
const CONCEPT_RELATIONSHIPS: Record<string, string[]> = {
  // Area concepts are related to each other and perimeter
  "area_rectangle": ["area_triangle", "area_circle", "perimeter", "volume"],
  "area_triangle": ["area_rectangle", "area_circle", "perimeter", "pythagorean_theorem"],
  "area_circle": ["area_rectangle", "area_triangle", "perimeter"],
  "perimeter": ["area_rectangle", "area_triangle", "area_circle"],
  "volume": ["area_rectangle", "area_triangle", "area_circle"],
  
  // Triangle-related concepts
  "pythagorean_theorem": ["area_triangle", "angles"],
  "angles": ["pythagorean_theorem", "area_triangle"],
  
  // Algebra concepts
  "linear_equations": ["quadratic_equations", "factoring", "slope", "multi_step"],
  "quadratic_equations": ["linear_equations", "factoring", "exponents", "multi_step"],
  "factoring": ["linear_equations", "quadratic_equations", "multi_step"],
  "exponents": ["quadratic_equations", "roots", "multi_step"],
  "roots": ["exponents", "quadratic_equations", "multi_step"],
  "slope": ["linear_equations", "multi_step"],
  
  // Multi-step problems are related to many concepts
  "multi_step": ["linear_equations", "quadratic_equations", "factoring", "exponents", "roots", "slope", "fractions", "decimals", "percentages"],
  
  // Arithmetic concepts
  "fractions": ["decimals", "percentages", "ratios", "multi_step"],
  "decimals": ["fractions", "percentages", "multi_step"],
  "percentages": ["fractions", "decimals", "ratios", "multi_step"],
  "ratios": ["fractions", "percentages", "multi_step"],
};

/**
 * Get related concept IDs for a given concept
 * Returns concepts that are actually related, not just same category
 */
export function getRelatedConceptIds(conceptId: string): string[] {
  // Direct relationships
  const direct = CONCEPT_RELATIONSHIPS[conceptId] || [];
  
  // Also find concepts that list this one as related (bidirectional)
  const reverse = Object.entries(CONCEPT_RELATIONSHIPS)
    .filter(([_, related]) => related.includes(conceptId))
    .map(([id]) => id);
  
  // Combine and deduplicate
  return [...new Set([...direct, ...reverse])];
}

