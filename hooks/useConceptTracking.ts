import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { ParsedProblem, Message } from "@/types";
import {
  extractConcepts,
  updateConceptMastery,
  ConceptTrackingData,
} from "@/services/conceptTracker";

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
      setConceptData({
        concepts: updatedConcepts,
        lastUpdated: Date.now(),
      });
    }
  }, [isSolved, problem?.text]); // Only run when problem is solved or problem changes
}

