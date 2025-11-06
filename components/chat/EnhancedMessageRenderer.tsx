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
    // Split by double newlines or long paragraphs
    const rawSections = content.split(/\n\n+/);
    const processed: Array<{ text: string; isLong: boolean; index: number }> = [];

    rawSections.forEach((section, index) => {
      const trimmed = section.trim();
      if (trimmed) {
        // More conservative: require BOTH character count AND line count to be significant
        // OR require very high character count alone
        const charCount = trimmed.length;
        const lineCount = trimmed.split('\n').length;
        
        // Consider it "long" only if:
        // 1. More than 300 characters AND more than 4 lines, OR
        // 2. More than 500 characters (regardless of lines), OR
        // 3. More than 6 lines (regardless of characters)
        const isLong = (charCount > 300 && lineCount > 4) || 
                      charCount > 500 || 
                      lineCount > 6;
        
        processed.push({
          text: trimmed,
          isLong,
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

  // If no sections, render normally
  if (sections.length === 0) {
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

  // If single short section and it's a user message, render normally
  if (sections.length === 1 && (!sections[0]?.isLong || isUser)) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {isUser ? (
          <span>{content}</span>
        ) : (
          <ConceptHighlightedRenderer content={sections[0].text} />
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
          <div key={`${section.index}-${isExpanded}`} className="relative">
            {section.isLong ? (
              <div>
                <div 
                  className="break-words transition-all duration-300"
                  style={shouldCollapse ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    maxHeight: '4.5rem',
                    textOverflow: 'ellipsis'
                  } : {
                    display: 'block',
                    maxHeight: 'none',
                    overflow: 'visible'
                  }}
                >
                  {isUser ? (
                    <span>{section.text}</span>
                  ) : (
                    <ConceptHighlightedRenderer content={section.text} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSection(section.index);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded px-1 py-0.5 select-none"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                  style={{ 
                    pointerEvents: 'auto', 
                    position: 'relative', 
                    zIndex: 10,
                    userSelect: 'none'
                  }}
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

