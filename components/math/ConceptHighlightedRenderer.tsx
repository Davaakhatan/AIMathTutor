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
  // First, process markdown formatting (bold, italic, etc.)
  // This needs to happen before MathRenderer to avoid conflicts
  const processMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Regex to match markdown formatting
    // **bold** or __bold__
    const boldRegex = /\*\*([^*]+?)\*\*|__([^_]+?)__/g;
    // *italic* or _italic_
    const italicRegex = /(?<!\*)\*([^*]+?)\*(?!\*)|(?<!_)_([^_]+?)_(?!_)/g;
    
    // Combine all markdown patterns
    const markdownRegex = /(\*\*([^*]+?)\*\*|__([^_]+?)__|(?<!\*)\*([^*]+?)\*(?!\*)|(?<!_)_([^_]+?)_(?!_))/g;
    
    let match;
    const matches: Array<{ index: number; length: number; type: 'bold' | 'italic'; content: string }> = [];
    
    // Find all markdown matches
    while ((match = markdownRegex.exec(text)) !== null) {
      const fullMatch = match[0];
      const content = match[2] || match[3] || match[4] || match[5] || match[6] || '';
      const isBold = fullMatch.startsWith('**') || fullMatch.startsWith('__');
      
      matches.push({
        index: match.index,
        length: fullMatch.length,
        type: isBold ? 'bold' : 'italic',
        content: content,
      });
    }
    
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

