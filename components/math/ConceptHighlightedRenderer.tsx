"use client";

import MathRenderer from "./MathRenderer";

interface ConceptHighlightedRendererProps {
  content: string;
}

/**
 * Renders content with LaTeX and Markdown support
 * Handles:
 * - LaTeX math expressions (via MathRenderer)
 * - Markdown formatting (**bold**, *italic*, etc.)
 * - Concept highlighting (via CSS)
 */
export default function ConceptHighlightedRenderer({
  content,
}: ConceptHighlightedRendererProps) {
  // Process markdown formatting (bold, italic, etc.)
  // This needs to happen before MathRenderer to avoid conflicts
  const processMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Simple markdown parser - handles **bold** and *italic*
    // Process bold first (to avoid conflicts with italic)
    const boldRegex = /\*\*([^*]+?)\*\*/g;
    const matches: Array<{ index: number; length: number; type: 'bold' | 'italic'; content: string }> = [];
    
    // Find all bold matches first
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'bold',
        content: match[1],
      });
    }
    
    // Then find italic matches (avoiding those already matched as bold)
    const italicRegex = /\*([^*]+?)\*/g;
    while ((match = italicRegex.exec(text)) !== null) {
      // Check if this match overlaps with any bold match
      const overlapsBold = matches.some(boldMatch => {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        const boldStart = boldMatch.index;
        const boldEnd = boldMatch.index + boldMatch.length;
        return (matchStart >= boldStart && matchStart < boldEnd) ||
               (matchEnd > boldStart && matchEnd <= boldEnd) ||
               (matchStart <= boldStart && matchEnd >= boldEnd);
      });
      
      if (!overlapsBold) {
        matches.push({
          index: match.index,
          length: match[0].length,
          type: 'italic',
          content: match[1],
        });
      }
    }
    
    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);
    
    // If no markdown, just render with MathRenderer
    if (matches.length === 0) {
      return [<MathRenderer key="content" content={text} />];
    }
    
    // Build parts array with markdown and regular text
    matches.forEach((match, idx) => {
      // Add text before this match
      if (match.index > lastIndex) {
        const textBefore = text.substring(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push(
            <MathRenderer key={`text-${idx}`} content={textBefore} />
          );
        }
      }
      
      // Add formatted text
      const FormattedText = match.type === 'bold' ? (
        <strong key={`bold-${idx}`}>
          <MathRenderer content={match.content} />
        </strong>
      ) : (
        <em key={`italic-${idx}`}>
          <MathRenderer content={match.content} />
        </em>
      );
      parts.push(FormattedText);
      
      lastIndex = match.index + match.length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText.trim()) {
        parts.push(
          <MathRenderer key={`text-end`} content={remainingText} />
        );
      }
    }
    
    return parts.length > 0 ? parts : [<MathRenderer key="content" content={text} />];
  };
  
  // Process markdown and render
  const processed = processMarkdown(content);
  
  return <span className="break-words">{processed}</span>;
}

