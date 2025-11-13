import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { ParsedProblem, Message } from "@/types";
import {
  extractConcepts,
  updateConceptMastery,
  ConceptTrackingData,
} from "@/services/conceptTracker";
import { logger } from "@/lib/logger";

/**
 * Hook to track concept mastery when problems are solved
 */
export function useConceptTracking(
  problem: ParsedProblem | null,
  messages: Message[],
  isSolved: boolean
) {
  const [conceptData, setConceptData] = useLocalStorage<ConceptTrackingData>(
    "aitutor-concepts",
    { concepts: {}, lastUpdated: Date.now() }
  );

  useEffect(() => {
    if (!problem || !isSolved || messages.length === 0) return;

    // Extract concepts from problem
    const concepts = extractConcepts(problem);
    logger.info("Problem solved - extracting concepts", {
      problemText: problem.text?.substring(0, 100),
      problemType: problem.type,
      extractedConcepts: concepts,
      conceptsCount: concepts.length,
    });

    // Count hints used
    const hintsUsed = messages.filter(
      (m) =>
        m.role === "tutor" &&
        (m.content.startsWith("💡 Hint:") ||
          (m.content.startsWith("💡") && m.content.toLowerCase().includes("hint")) ||
          /^hint\s*:/i.test(m.content.trim()))
    ).length;

    // Estimate time spent (rough estimate: 2 minutes per exchange)
    const exchanges = messages.length;
    const timeSpent = Math.max(1, Math.round((exchanges * 2) / 2)); // At least 1 minute

    // Update mastery for each concept
    const updatedConcepts = { ...conceptData.concepts };

    concepts.forEach((conceptId) => {
      updatedConcepts[conceptId] = updateConceptMastery(
        conceptId,
        true, // wasSolved
        hintsUsed,
        timeSpent,
        conceptData
      );
    });

    // Only update if we actually tracked concepts
    if (concepts.length > 0) {
      logger.debug("Updating concept mastery", {
        concepts,
        conceptsCount: concepts.length,
        hintsUsed,
        timeSpent,
      });
      setConceptData({
        concepts: updatedConcepts,
        lastUpdated: Date.now(),
      });
      // Dispatch event to notify other components (like LearningPath)
      window.dispatchEvent(new CustomEvent("concept_data_updated", {
        detail: { concepts, lastUpdated: Date.now() }
      }));
    } else {
      logger.debug("No concepts extracted from problem", {
        problemText: problem.text?.substring(0, 50),
        problemType: problem.type,
      });
    }
  }, [isSolved, problem?.text]); // Only run when problem is solved or problem changes
}

