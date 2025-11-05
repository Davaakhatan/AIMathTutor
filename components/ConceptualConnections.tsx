"use client";

import { useState, useEffect, memo } from "react";
import { ParsedProblem } from "@/types";
import { extractConcepts, getConceptsByCategory } from "@/services/conceptTracker";
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
    
    // Find related concepts (same category or frequently used together)
    const related: RelatedConcept[] = [];
    
    currentConcepts.forEach((currentConceptId) => {
      const currentConcept = conceptData.concepts?.[currentConceptId];
      if (!currentConcept) return;

      // Find concepts in the same category
      allConcepts.forEach((concept) => {
        if (
          concept.id !== currentConceptId &&
          concept.category === currentConcept.category &&
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
    });

    // Sort by mastery level (lower = needs more practice)
    related.sort((a, b) => a.masteryLevel - b.masteryLevel);

    // Limit to top 5 related concepts
    setRelatedConcepts(related.slice(0, 5));
  }, [problem, conceptData]);

  if (relatedConcepts.length === 0) {
    return null; // Don't show if no related concepts
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
            🔗 Related Concepts
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
            Related concepts you&apos;ve practiced:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relatedConcepts.map((concept) => (
              <div
                key={concept.id}
                className={`px-2 py-1 rounded-lg text-xs transition-all ${
                  concept.masteryLevel >= 70
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                    : concept.masteryLevel >= 50
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                    : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700"
                }`}
                title={`${concept.name}: ${concept.masteryLevel}% mastery`}
              >
                {concept.name}
                {concept.masteryLevel < 70 && (
                  <span className="ml-1 text-[10px] opacity-75">({concept.masteryLevel}%)</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
            💡 These concepts are related to what you&apos;re working on. Review them to strengthen your understanding!
          </p>
        </div>
      )}
    </div>
  );
});

export default ConceptualConnections;

