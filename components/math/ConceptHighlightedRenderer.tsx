"use client";

import MathRenderer from "./MathRenderer";

interface ConceptHighlightedRendererProps {
  content: string;
}

/**
 * Renders content with LaTeX support
 * Concept highlighting is handled via CSS in the message container
 * This component focuses on proper LaTeX rendering
 */
export default function ConceptHighlightedRenderer({
  content,
}: ConceptHighlightedRendererProps) {
  // For now, just use MathRenderer - concept highlighting can be added via CSS
  // or a more sophisticated parsing approach later
  return <MathRenderer content={content} />;
}

