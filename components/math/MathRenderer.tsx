"use client";

import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  content: string;
  displayMode?: "inline" | "block";
}

export default function MathRenderer({
  content,
  displayMode = "inline",
}: MathRendererProps) {
  // Enhanced regex to detect LaTeX math (handles various formats)
  const mathRegex = /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+?\$|\\begin\{[\s\S]*?\\end\{/g;
  
  // Check if content has math
  const hasMath = mathRegex.test(content);

  if (!hasMath) {
    // No math, just render as text with line breaks
    return (
      <span className="whitespace-pre-wrap break-words">
        {content}
      </span>
    );
  }

  // Split content into text and math parts
  const parts: (string | { type: "math"; content: string; isBlock: boolean })[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex
  const regex = new RegExp(mathRegex.source, "g");
  const contentCopy = content;

  while ((match = regex.exec(contentCopy)) !== null) {
    // Add text before math
    if (match.index > lastIndex) {
      const textBefore = contentCopy.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push(textBefore);
      }
    }

    // Extract math content (remove $ signs or delimiters)
    let mathContent = match[0];
    let isBlock = false;

    if (mathContent.startsWith("$$")) {
      mathContent = mathContent.slice(2, -2);
      isBlock = true;
    } else if (mathContent.startsWith("\\[")) {
      mathContent = mathContent.slice(2, -2);
      isBlock = true;
    } else if (mathContent.startsWith("\\(")) {
      mathContent = mathContent.slice(2, -2);
      isBlock = false;
    } else if (mathContent.startsWith("$")) {
      mathContent = mathContent.slice(1, -1);
      isBlock = false;
    } else if (mathContent.startsWith("\\begin")) {
      isBlock = true;
    }

    parts.push({
      type: "math",
      content: mathContent.trim(),
      isBlock: isBlock || displayMode === "block",
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < contentCopy.length) {
    const remainingText = contentCopy.substring(lastIndex);
    if (remainingText.trim()) {
      parts.push(remainingText);
    }
  }

  return (
    <span className="break-words">
      {parts.map((part, index) => {
        if (typeof part === "string") {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {part}
            </span>
          );
        } else {
          try {
            return part.isBlock ? (
              <div key={index} className="my-2 overflow-x-auto">
                <BlockMath math={part.content} />
              </div>
            ) : (
              <InlineMath key={index} math={part.content} />
            );
          } catch (error) {
            // If KaTeX fails, render as code with error indicator
            return (
              <code
                key={index}
                className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono"
                title="Math rendering error"
              >
                {part.content}
              </code>
            );
          }
        }
      })}
    </span>
  );
}
