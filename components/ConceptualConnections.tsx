"use client";

import { useState, useEffect, memo } from "react";
import { ParsedProblem } from "@/types";
import { extractConcepts, getRelatedConceptIds } from "@/services/conceptTracker";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ConceptTrackingData } from "@/services/conceptTracker";

interface ConceptualConnectionsProps {
  problem: ParsedProblem;
  compact?: boolean;
}

interface RelatedConcept {
  id: string;
  name: string;
  category: string;
  masteryLevel: number;
  relatedProblems?: number;
}

const ConceptualConnections = memo(function ConceptualConnections({
  problem,
  compact = false,
}: ConceptualConnectionsProps) {
  const [conceptData] = useLocalStorage<ConceptTrackingData>("aitutor-concepts", { concepts: {}, lastUpdated: Date.now() });
  const [relatedConcepts, setRelatedConcepts] = useState<RelatedConcept[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!problem) {
      setRelatedConcepts([]);
      return;
    }

    // Extract concepts from current problem
    const currentConcepts = extractConcepts(problem);
    
    // Get all tracked concepts
    const allConcepts = Object.values(conceptData.concepts || {});
    
    // Find related concepts using relationship map (not just same category)
    const related: RelatedConcept[] = [];
    const relatedConceptIds = new Set<string>();
    
    // For each concept in the current problem, find its related concepts
    currentConcepts.forEach((currentConceptId) => {
      // Get concepts that are actually related to this one
      const relatedIds = getRelatedConceptIds(currentConceptId);
      relatedIds.forEach(id => relatedConceptIds.add(id));
    });
    
    // Find tracked concepts that match the related concept IDs
    allConcepts.forEach((concept) => {
      // Only include if:
      // 1. It's a related concept (from relationship map)
      // 2. It's not one of the current problem's concepts
      // 3. It hasn't been added already
      if (
        relatedConceptIds.has(concept.id) &&
        !currentConcepts.includes(concept.id) &&
        !related.find(r => r.id === concept.id)
      ) {
        related.push({
          id: concept.id,
          name: concept.name,
          category: concept.category,
          masteryLevel: concept.masteryLevel,
        });
      }
    });

    // Also add related concepts that user hasn't practiced yet (from relationship map)
    // This helps new users see what concepts are related, even if they haven't practiced them
    relatedConceptIds.forEach((relatedId) => {
      // Skip if already added or if it's a current concept
      if (
        currentConcepts.includes(relatedId) ||
        related.find(r => r.id === relatedId)
      ) {
        return;
      }

      // Check if user has practiced this concept
      const practicedConcept = allConcepts.find(c => c.id === relatedId);
      
      if (!practicedConcept) {
        // User hasn't practiced this yet - add it with default values
        // Format the concept ID to a readable name
        const conceptName = relatedId
          .split("_")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        
        related.push({
          id: relatedId,
          name: conceptName,
          category: "general", // Default category
          masteryLevel: 0, // Not practiced yet - will show as "New"
        });
      }
    });

    // Sort by: practiced concepts first (by mastery level), then unpracticed
    related.sort((a, b) => {
      // If both are practiced or both are unpracticed, sort by mastery level
      const aPracticed = a.masteryLevel > 0;
      const bPracticed = b.masteryLevel > 0;
      
      if (aPracticed && !bPracticed) return -1; // Practiced first
      if (!aPracticed && bPracticed) return 1;  // Unpracticed last
      
      // Both same type, sort by mastery level (lower = needs more practice)
      return a.masteryLevel - b.masteryLevel;
    });

    // Limit to top 5 related concepts
    setRelatedConcepts(related.slice(0, 5));
  }, [problem, conceptData]);

  if (relatedConcepts.length === 0) {
    return null; // Don't show if no related concepts found
  }

  // Get concepts from current problem for display
  const currentConcepts = extractConcepts(problem);
  const currentConceptNames = currentConcepts
    .map(id => conceptData.concepts?.[id]?.name || id)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-3 ${compact ? 'mb-2' : 'mb-4'} transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 transition-colors">
            Related Concepts
          </h4>
          {currentConceptNames.length > 0 && (
            <span className="text-xs text-gray-600 dark:text-gray-400 transition-colors">
              ({currentConceptNames.join(", ")})
            </span>
          )}
        </div>
        {!compact && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">
            Related concepts {relatedConcepts.some(c => c.masteryLevel > 0) ? "you've practiced" : "to explore"}:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relatedConcepts.map((concept) => (
              <div
                key={concept.id}
                className={`px-2 py-1 rounded-lg text-xs transition-all ${
                  concept.masteryLevel === 0
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600"
                    : concept.masteryLevel >= 70
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                    : concept.masteryLevel >= 50
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                    : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700"
                }`}
                title={
                  concept.masteryLevel === 0
                    ? `${concept.name}: Not practiced yet`
                    : `${concept.name}: ${concept.masteryLevel}% mastery`
                }
              >
                {concept.name}
                {concept.masteryLevel === 0 ? (
                  <span className="ml-1 text-[10px] opacity-75">(New)</span>
                ) : concept.masteryLevel < 70 ? (
                  <span className="ml-1 text-[10px] opacity-75">({concept.masteryLevel}%)</span>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
            These concepts are related to what you&apos;re working on. Review them to strengthen your understanding!
          </p>
        </div>
      )}
    </div>
  );
});

export default ConceptualConnections;

