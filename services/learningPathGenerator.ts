import { ParsedProblem, ProblemType } from "@/types";
import { ConceptTrackingData, MathConcept, getAllConcepts, getConceptsByCategory } from "./conceptTracker";
import { logger } from "@/lib/logger";

/**
 * Learning path step
 */
export interface LearningPathStep {
  id: string;
  stepNumber: number;
  conceptId: string;
  conceptName: string;
  difficulty: "elementary" | "middle school" | "high school" | "advanced";
  problemType: ProblemType;
  description: string;
  prerequisites: string[]; // Concept IDs that should be mastered first
  completed: boolean;
  problem?: ParsedProblem; // Generated problem for this step
  completedAt?: number;
}

/**
 * Learning path
 */
export interface LearningPath {
  id: string;
  goal: string;
  targetConcepts: string[]; // Concept IDs to master
  steps: LearningPathStep[];
  currentStep: number; // 0-based index
  createdAt: number;
  lastUpdated: number;
  progress: number; // 0-100
}

/**
 * Concept learning sequences
 * Maps concepts to their prerequisite concepts and learning order
 */
const CONCEPT_SEQUENCES: Record<string, {
  prerequisites: string[];
  difficulty: "elementary" | "middle school" | "high school" | "advanced";
  problemTypes: ProblemType[];
}> = {
  "linear_equations": {
    prerequisites: ["fractions", "decimals"],
    difficulty: "middle school",
    problemTypes: [ProblemType.ALGEBRA, ProblemType.WORD_PROBLEM],
  },
  "quadratic_equations": {
    prerequisites: ["linear_equations", "factoring", "exponents"],
    difficulty: "high school",
    problemTypes: [ProblemType.ALGEBRA, ProblemType.MULTI_STEP],
  },
  "factoring": {
    prerequisites: ["linear_equations", "exponents"],
    difficulty: "middle school",
    problemTypes: [ProblemType.ALGEBRA],
  },
  "pythagorean_theorem": {
    prerequisites: ["area_triangle", "exponents"],
    difficulty: "middle school",
    problemTypes: [ProblemType.GEOMETRY, ProblemType.WORD_PROBLEM],
  },
  "area_circle": {
    prerequisites: ["area_rectangle", "decimals"],
    difficulty: "middle school",
    problemTypes: [ProblemType.GEOMETRY],
  },
  "area_triangle": {
    prerequisites: ["area_rectangle"],
    difficulty: "elementary",
    problemTypes: [ProblemType.GEOMETRY],
  },
  "area_rectangle": {
    prerequisites: [],
    difficulty: "elementary",
    problemTypes: [ProblemType.GEOMETRY],
  },
  "perimeter": {
    prerequisites: [],
    difficulty: "elementary",
    problemTypes: [ProblemType.GEOMETRY],
  },
  "angles": {
    prerequisites: ["perimeter"],
    difficulty: "middle school",
    problemTypes: [ProblemType.GEOMETRY],
  },
  "fractions": {
    prerequisites: [],
    difficulty: "elementary",
    problemTypes: [ProblemType.ARITHMETIC],
  },
  "decimals": {
    prerequisites: ["fractions"],
    difficulty: "elementary",
    problemTypes: [ProblemType.ARITHMETIC],
  },
  "percentages": {
    prerequisites: ["fractions", "decimals"],
    difficulty: "middle school",
    problemTypes: [ProblemType.ARITHMETIC, ProblemType.WORD_PROBLEM],
  },
  "ratios": {
    prerequisites: ["fractions"],
    difficulty: "middle school",
    problemTypes: [ProblemType.ARITHMETIC, ProblemType.WORD_PROBLEM],
  },
  "exponents": {
    prerequisites: ["fractions"],
    difficulty: "middle school",
    problemTypes: [ProblemType.ALGEBRA],
  },
  "roots": {
    prerequisites: ["exponents"],
    difficulty: "high school",
    problemTypes: [ProblemType.ALGEBRA],
  },
  "slope": {
    prerequisites: ["linear_equations"],
    difficulty: "high school",
    problemTypes: [ProblemType.ALGEBRA],
  },
  "volume": {
    prerequisites: ["area_rectangle"],
    difficulty: "middle school",
    problemTypes: [ProblemType.GEOMETRY],
  },
};

/**
 * Generate a learning path for a given goal
 */
export function generateLearningPath(
  goal: string,
  conceptData?: ConceptTrackingData,
  apiKey?: string
): LearningPath {
  // Extract target concepts from goal
  const targetConcepts = extractConceptsFromGoal(goal);
  
  // Build dependency-ordered sequence
  const steps = buildLearningSequence(targetConcepts, conceptData);
  
  // Calculate initial progress
  const completedSteps = steps.filter(s => s.completed).length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;
  
  // Find current step (first incomplete step)
  const currentStepIndex = steps.findIndex(s => !s.completed);
  const currentStep = currentStepIndex >= 0 ? currentStepIndex : steps.length - 1;
  
  const path: LearningPath = {
    id: `path-${Date.now()}`,
    goal,
    targetConcepts,
    steps,
    currentStep,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    progress: Math.round(progress),
  };
  
  logger.info("Generated learning path", {
    goal,
    targetConcepts,
    stepsCount: steps.length,
    progress,
  });
  
  return path;
}

/**
 * Extract concept IDs from a goal string
 */
function extractConceptsFromGoal(goal: string): string[] {
  const goalLower = goal.toLowerCase();
  const concepts: string[] = [];
  
  // Check each known concept
  for (const [conceptId, config] of Object.entries(CONCEPT_SEQUENCES)) {
    const conceptName = conceptId.replace(/_/g, " ");
    
    // Check if goal mentions this concept
    if (
      goalLower.includes(conceptName) ||
      goalLower.includes(conceptId) ||
      goalLower.includes(config.difficulty)
    ) {
      concepts.push(conceptId);
    }
  }
  
  // If no specific concepts found, try to infer from keywords
  if (concepts.length === 0) {
    if (goalLower.includes("algebra") || goalLower.includes("equation")) {
      concepts.push("linear_equations", "factoring");
    } else if (goalLower.includes("geometry") || goalLower.includes("triangle") || goalLower.includes("circle")) {
      concepts.push("area_triangle", "area_circle", "pythagorean_theorem");
    } else if (goalLower.includes("fraction") || goalLower.includes("decimal")) {
      concepts.push("fractions", "decimals", "percentages");
    } else {
      // Default: start with basic concepts
      concepts.push("fractions", "area_rectangle", "linear_equations");
    }
  }
  
  return [...new Set(concepts)]; // Remove duplicates
}

/**
 * Build a learning sequence with proper dependency ordering
 */
function buildLearningSequence(
  targetConcepts: string[],
  conceptData?: ConceptTrackingData
): LearningPathStep[] {
  const steps: LearningPathStep[] = [];
  const addedConcepts = new Set<string>();
  const conceptMastery = new Map<string, number>();
  
  // Get mastery levels for all concepts
  if (conceptData?.concepts) {
    Object.values(conceptData.concepts).forEach(concept => {
      conceptMastery.set(concept.id, concept.masteryLevel);
    });
  }
  
  // Collect all prerequisites
  const allConcepts = new Set<string>(targetConcepts);
  targetConcepts.forEach(conceptId => {
    const prereqs = CONCEPT_SEQUENCES[conceptId]?.prerequisites || [];
    prereqs.forEach(prereq => allConcepts.add(prereq));
  });
  
  // Build dependency graph
  const conceptsToLearn = Array.from(allConcepts);
  
  // Sort by prerequisites (topological sort)
  const sortedConcepts = topologicalSort(conceptsToLearn);
  
  // Create steps
  sortedConcepts.forEach((conceptId, index) => {
    const config = CONCEPT_SEQUENCES[conceptId];
    if (!config) return;
    
    const mastery = conceptMastery.get(conceptId) || 0;
    const isCompleted = mastery >= 70; // Mastery threshold
    
    steps.push({
      id: `step-${conceptId}-${index}`,
      stepNumber: index + 1,
      conceptId,
      conceptName: formatConceptName(conceptId),
      difficulty: config.difficulty,
      problemType: config.problemTypes[0] || ProblemType.ALGEBRA,
      description: `Learn ${formatConceptName(conceptId)}`,
      prerequisites: config.prerequisites,
      completed: isCompleted,
      completedAt: isCompleted ? Date.now() : undefined,
    });
    
    addedConcepts.add(conceptId);
  });
  
  return steps;
}

/**
 * Topological sort to order concepts by dependencies
 */
function topologicalSort(conceptIds: string[]): string[] {
  const visited = new Set<string>();
  const result: string[] = [];
  
  function visit(conceptId: string) {
    if (visited.has(conceptId)) return;
    
    const config = CONCEPT_SEQUENCES[conceptId];
    if (config) {
      // Visit prerequisites first
      config.prerequisites.forEach(prereq => {
        if (conceptIds.includes(prereq)) {
          visit(prereq);
        }
      });
    }
    
    visited.add(conceptId);
    result.push(conceptId);
  }
  
  conceptIds.forEach(conceptId => visit(conceptId));
  
  return result;
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
 * Update learning path progress
 */
export function updateLearningPathProgress(
  path: LearningPath,
  completedConceptId: string,
  conceptData?: ConceptTrackingData
): LearningPath {
  const updatedSteps = path.steps.map(step => {
    if (step.conceptId === completedConceptId && !step.completed) {
      return {
        ...step,
        completed: true,
        completedAt: Date.now(),
      };
    }
    return step;
  });
  
  // Update mastery from concept data
  if (conceptData?.concepts) {
    const concept = conceptData.concepts[completedConceptId];
    if (concept) {
      updatedSteps.forEach(step => {
        if (step.conceptId === completedConceptId) {
          step.completed = concept.masteryLevel >= 70;
        }
      });
    }
  }
  
  const completedSteps = updatedSteps.filter(s => s.completed).length;
  const progress = updatedSteps.length > 0 ? (completedSteps / updatedSteps.length) * 100 : 0;
  const currentStepIndex = updatedSteps.findIndex(s => !s.completed);
  const currentStep = currentStepIndex >= 0 ? currentStepIndex : updatedSteps.length - 1;
  
  return {
    ...path,
    steps: updatedSteps,
    currentStep,
    progress: Math.round(progress),
    lastUpdated: Date.now(),
  };
}

/**
 * Get next problem for current step
 */
export async function getNextProblemForStep(
  step: LearningPathStep,
  apiKey?: string
): Promise<ParsedProblem | null> {
  try {
    const response = await fetch("/api/generate-problem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: step.problemType,
        difficulty: step.difficulty,
        ...(apiKey && { apiKey }),
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.problem) {
        return result.problem;
      }
    }
  } catch (error) {
    logger.error("Failed to generate problem for learning path step", { error, step });
  }
  
  return null;
}

