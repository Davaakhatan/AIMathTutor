"use client";

/**
 * Parses AI messages to extract drawing suggestions
 * Looks for patterns like:
 * - "Let's add a height line here"
 * - "Draw a perpendicular line from point A"
 * - "Try drawing a triangle with sides..."
 * - "Add a label 'x' here"
 */

export interface DrawingSuggestion {
  type: "line" | "shape" | "label" | "annotation" | "highlight";
  description: string;
  action: string; // What the user should do
  position?: {
    relative?: string; // "top", "bottom", "left", "right", "center"
    reference?: string; // Reference to existing elements
  };
  shape?: "triangle" | "rectangle" | "circle" | "line" | "perpendicular";
  coordinates?: {
    x?: number;
    y?: number;
  };
}

/**
 * Parse drawing suggestions from AI message text
 */
export function parseDrawingSuggestions(text: string): DrawingSuggestion[] {
  const suggestions: DrawingSuggestion[] = [];
  const lowerText = text.toLowerCase();

  // Pattern 1: "Let's add/draw [shape/element] [here/from X/to Y]"
  const addDrawPatterns = [
    /(?:let'?s|try|we can|you can)\s+(?:add|draw|create|make)\s+(?:a|an)\s+([^.!?]+?)(?:here|from\s+([^.!?]+?)|to\s+([^.!?]+?)|at\s+([^.!?]+?))?[.!?]/gi,
    /(?:add|draw|create)\s+(?:a|an)\s+([^.!?]+?)\s+(?:here|from\s+([^.!?]+?)|to\s+([^.!?]+?)|at\s+([^.!?]+?))[.!?]/gi,
  ];

  // Pattern 2: "[Shape] with [properties]" suggestions
  const shapePatterns = [
    /(?:draw|create|make)\s+(?:a|an)\s+(triangle|rectangle|circle|square|line)\s+(?:with|that has|where|at)\s+([^.!?]+?)[.!?]/gi,
  ];

  // Pattern 3: Label suggestions
  const labelPatterns = [
    /(?:add|put|write)\s+(?:a|an)\s+label\s+(?:of|for|saying)\s+['"]?([^'"]+?)['"]?\s+(?:here|at|on|near)/gi,
    /label\s+(?:it|this|the|the\s+\w+)\s+(?:as|with|with\s+the\s+label)\s+['"]?([^'"]+?)['"]?/gi,
  ];

  // Pattern 4: Highlight/annotation suggestions
  const highlightPatterns = [
    /(?:highlight|mark|circle|indicate|point\s+out)\s+([^.!?]+?)[.!?]/gi,
    /(?:look\s+at|focus\s+on|pay\s+attention\s+to)\s+([^.!?]+?)[.!?]/gi,
  ];

  // Extract "add/draw" suggestions
  addDrawPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const element = match[1]?.trim() || "";
      const fromRef = match[2]?.trim();
      const toRef = match[3]?.trim();
      const atRef = match[4]?.trim();

      if (element) {
        const suggestion: DrawingSuggestion = {
          type: detectType(element),
          description: match[0],
          action: `Add ${element}${fromRef ? ` from ${fromRef}` : ""}${toRef ? ` to ${toRef}` : ""}${atRef ? ` at ${atRef}` : ""}`,
          shape: detectShape(element),
        };

        if (fromRef || toRef) {
          suggestion.position = {
            reference: fromRef || toRef,
          };
        }

        suggestions.push(suggestion);
      }
    }
  });

  // Extract shape suggestions
  shapePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const shape = match[1]?.trim();
      const properties = match[2]?.trim();

      if (shape) {
        suggestions.push({
          type: "shape",
          description: match[0],
          action: `Draw a ${shape}${properties ? ` ${properties}` : ""}`,
          shape: shape as any,
        });
      }
    }
  });

  // Extract label suggestions
  labelPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const label = match[1]?.trim();

      if (label) {
        suggestions.push({
          type: "label",
          description: match[0],
          action: `Add label "${label}"`,
        });
      }
    }
  });

  // Extract highlight suggestions
  highlightPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const element = match[1]?.trim();

      if (element) {
        suggestions.push({
          type: "highlight",
          description: match[0],
          action: `Highlight ${element}`,
        });
      }
    }
  });

  return suggestions;
}

/**
 * Detect suggestion type from text
 */
function detectType(text: string): DrawingSuggestion["type"] {
  const lower = text.toLowerCase();

  if (lower.includes("label") || lower.includes("text") || lower.includes("name")) {
    return "label";
  }
  if (lower.includes("line") || lower.includes("segment") || lower.includes("perpendicular")) {
    return "line";
  }
  if (lower.includes("triangle") || lower.includes("rectangle") || lower.includes("circle") || lower.includes("square")) {
    return "shape";
  }
  if (lower.includes("highlight") || lower.includes("mark") || lower.includes("circle") || lower.includes("indicate")) {
    return "highlight";
  }

  return "annotation";
}

/**
 * Detect shape type from text
 */
function detectShape(text: string): DrawingSuggestion["shape"] | undefined {
  const lower = text.toLowerCase();

  if (lower.includes("triangle")) return "triangle";
  if (lower.includes("rectangle") || lower.includes("square")) return "rectangle";
  if (lower.includes("circle")) return "circle";
  if (lower.includes("line") || lower.includes("perpendicular")) return "line";
  if (lower.includes("perpendicular")) return "perpendicular";

  return undefined;
}

/**
 * Check if message contains drawing suggestions
 */
export function hasDrawingSuggestions(text: string): boolean {
  const suggestions = parseDrawingSuggestions(text);
  return suggestions.length > 0;
}

