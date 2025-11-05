"use client";

import { useState, useMemo } from "react";
import MathRenderer from "../math/MathRenderer";
import ConceptHighlightedRenderer from "../math/ConceptHighlightedRenderer";

interface EnhancedMessageRendererProps {
  content: string;
  isUser?: boolean;
}

/**
 * Enhanced message renderer with:
 * - Collapsible sections for long explanations
 * - Key concept highlighting
 * - Better LaTeX rendering (via MathRenderer)
 */
export default function EnhancedMessageRenderer({
  content,
  isUser = false,
}: EnhancedMessageRendererProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  // Split content into sections (by paragraphs or long blocks)
  const sections = useMemo(() => {
    // Split by double newlines or long paragraphs (> 200 chars)
    const rawSections = content.split(/\n\n+/);
    const processed: Array<{ text: string; isLong: boolean; index: number }> = [];

    rawSections.forEach((section, index) => {
      const trimmed = section.trim();
      if (trimmed) {
        processed.push({
          text: trimmed,
          isLong: trimmed.length > 200 || trimmed.split('\n').length > 3,
          index,
        });
      }
    });

    return processed;
  }, [content, isUser]);


  // Toggle section expansion
  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // If no sections or single short section, render normally
  if (sections.length <= 1 && (!sections[0]?.isLong || isUser)) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {isUser ? (
          <span>{content}</span>
        ) : (
          <ConceptHighlightedRenderer content={content} />
        )}
      </div>
    );
  }

  // Render with collapsible sections
  return (
    <div className="space-y-2">
      {sections.map((section, idx) => {
        const isExpanded = expandedSections.has(section.index);
        const shouldCollapse = section.isLong && !isExpanded;

        return (
          <div key={section.index} className="relative">
            {section.isLong ? (
              <div>
                <div className={`break-words ${shouldCollapse ? "line-clamp-3" : ""}`}>
                  {isUser ? (
                    <span>{section.text}</span>
                  ) : (
                    <ConceptHighlightedRenderer content={section.text} />
                  )}
                </div>
                <button
                  onClick={() => toggleSection(section.index)}
                  className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                      Show less
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      Show more
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="break-words">
                {isUser ? (
                  <span>{section.text}</span>
                ) : (
                  <ConceptHighlightedRenderer content={section.text} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

