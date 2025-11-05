"use client";

import { useEffect, useRef } from "react";

interface DrawingInstruction {
  type: "rectangle" | "circle" | "triangle" | "line" | "text" | "freehand";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  endX?: number;
  endY?: number;
  color?: string;
  lineWidth?: number;
  text?: string;
  label?: string;
  points?: Array<{ x: number; y: number }>;
}

interface ExampleDrawingRendererProps {
  instructions: DrawingInstruction[];
  canvasWidth?: number;
  canvasHeight?: number;
  onRendered?: () => void;
}

/**
 * Renders AI-generated example drawings on a canvas
 * Used to show example solutions or visual guides
 */
export default function ExampleDrawingRenderer({
  instructions,
  canvasWidth = 400,
  canvasHeight = 300,
  onRendered,
}: ExampleDrawingRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || instructions.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#000000";
    ctx.lineWidth = 2;

    // Render each instruction
    instructions.forEach((instruction) => {
      const color = instruction.color || "#000000";
      const lineWidth = instruction.lineWidth || 2;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.font = "16px Arial";

      switch (instruction.type) {
        case "rectangle":
          if (instruction.x !== undefined && instruction.y !== undefined && instruction.width && instruction.height) {
            ctx.strokeRect(instruction.x, instruction.y, instruction.width, instruction.height);
            if (instruction.label) {
              ctx.fillText(instruction.label, instruction.x + instruction.width / 2 - 20, instruction.y - 5);
            }
          }
          break;

        case "circle":
          if (instruction.x !== undefined && instruction.y !== undefined && instruction.radius) {
            ctx.beginPath();
            ctx.arc(instruction.x, instruction.y, instruction.radius, 0, 2 * Math.PI);
            ctx.stroke();
            if (instruction.label) {
              ctx.fillText(instruction.label, instruction.x + instruction.radius + 5, instruction.y);
            }
          }
          break;

        case "triangle":
          if (instruction.x !== undefined && instruction.y !== undefined && instruction.endX && instruction.endY) {
            const midX = (instruction.x + instruction.endX) / 2;
            const midY = instruction.y;
            const bottomX = instruction.x + (instruction.endX - instruction.x) / 2;
            const bottomY = instruction.endY;

            ctx.beginPath();
            ctx.moveTo(instruction.x, instruction.y);
            ctx.lineTo(instruction.endX, instruction.endY);
            ctx.lineTo(bottomX, bottomY);
            ctx.closePath();
            ctx.stroke();
            if (instruction.label) {
              ctx.fillText(instruction.label, midX - 10, midY - 10);
            }
          }
          break;

        case "line":
          if (instruction.x !== undefined && instruction.y !== undefined && instruction.endX && instruction.endY) {
            ctx.beginPath();
            ctx.moveTo(instruction.x, instruction.y);
            ctx.lineTo(instruction.endX, instruction.endY);
            ctx.stroke();
            if (instruction.label) {
              const midX = (instruction.x + instruction.endX) / 2;
              const midY = (instruction.y + instruction.endY) / 2;
              ctx.fillText(instruction.label, midX, midY - 5);
            }
          }
          break;

        case "text":
          if (instruction.x !== undefined && instruction.y !== undefined && instruction.text) {
            ctx.fillText(instruction.text, instruction.x, instruction.y);
          }
          break;

        case "freehand":
          if (instruction.points && instruction.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(instruction.points[0].x, instruction.points[0].y);
            for (let i = 1; i < instruction.points.length; i++) {
              ctx.lineTo(instruction.points[i].x, instruction.points[i].y);
            }
            ctx.stroke();
          }
          break;
      }
    });

    if (onRendered) {
      onRendered();
    }
  }, [instructions, onRendered]);

  if (instructions.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        <span className="font-medium">Example Diagram:</span>
      </div>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border border-gray-200 dark:border-gray-700 rounded w-full"
        style={{ maxWidth: "100%" }}
      />
    </div>
  );
}

/**
 * Parse AI-generated drawing instructions from text
 * Looks for patterns like "draw a rectangle at (100, 50) with width 200 and height 100"
 * or structured JSON instructions
 */
export function parseDrawingInstructions(text: string): DrawingInstruction[] {
  const instructions: DrawingInstruction[] = [];

  // Try to extract JSON instructions first
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        return parsed as DrawingInstruction[];
      }
    } catch (e) {
      // Fall through to pattern matching
    }
  }

  // Pattern matching for common drawing instructions
  const lowerText = text.toLowerCase();

  // Rectangle pattern: "draw a rectangle at (x, y) with width w and height h"
  const rectPattern = /rectangle.*?(\d+).*?(\d+).*?width.*?(\d+).*?height.*?(\d+)/i;
  const rectMatch = text.match(rectPattern);
  if (rectMatch) {
    instructions.push({
      type: "rectangle",
      x: parseInt(rectMatch[1]),
      y: parseInt(rectMatch[2]),
      width: parseInt(rectMatch[3]),
      height: parseInt(rectMatch[4]),
      color: "#2563eb",
    });
  }

  // Circle pattern: "draw a circle at (x, y) with radius r"
  const circlePattern = /circle.*?(\d+).*?(\d+).*?radius.*?(\d+)/i;
  const circleMatch = text.match(circlePattern);
  if (circleMatch) {
    instructions.push({
      type: "circle",
      x: parseInt(circleMatch[1]),
      y: parseInt(circleMatch[2]),
      radius: parseInt(circleMatch[3]),
      color: "#2563eb",
    });
  }

  // Triangle pattern: "draw a triangle with vertices at..."
  const trianglePattern = /triangle.*?(\d+).*?(\d+).*?(\d+).*?(\d+)/i;
  const triangleMatch = text.match(trianglePattern);
  if (triangleMatch) {
    instructions.push({
      type: "triangle",
      x: parseInt(triangleMatch[1]),
      y: parseInt(triangleMatch[2]),
      endX: parseInt(triangleMatch[3]),
      endY: parseInt(triangleMatch[4]),
      color: "#2563eb",
    });
  }

  return instructions;
}

