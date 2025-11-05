"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface WhiteboardProps {
  isEnabled?: boolean;
  onDrawingChange?: (hasDrawing: boolean) => void;
  onSendDrawing?: (imageDataUrl: string) => void;
  onReviewDrawing?: (imageDataUrl: string) => void;
  compact?: boolean; // Compact mode for sidebar integration
}

// Shape types for object tracking
interface Shape {
  id: string;
  type: "rectangle" | "circle" | "triangle" | "line" | "text";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  endX?: number;
  endY?: number;
  color: string;
  lineWidth: number;
  text?: string;
}

interface FreehandPath {
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth: number;
}

export default function Whiteboard({
  isEnabled = true,
  onDrawingChange,
  onSendDrawing,
  onReviewDrawing,
  compact = false,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [hasContent, setHasContent] = useState(false);
  const [drawingMode, setDrawingMode] = useState<"freehand" | "rectangle" | "circle" | "triangle" | "line" | "text" | "select">("freehand");
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null); // For shape preview
  const [textInput, setTextInput] = useState<{ x: number; y: number; text: string } | null>(null);
  
  // Store shapes and paths as objects for selection/moving
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [freehandPaths, setFreehandPaths] = useState<FreehandPath[]>([]);
  const [currentPath, setCurrentPath] = useState<FreehandPath | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const colors = [
    "#000000", // Black
    "#2563eb", // Blue
    "#dc2626", // Red
    "#16a34a", // Green
    "#ca8a04", // Yellow
    "#9333ea", // Purple
  ];

  // Redraw all shapes and paths
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all freehand paths
    freehandPaths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });
    
    // Draw current path if drawing
    if (currentPath && currentPath.points.length > 1) {
      ctx.strokeStyle = currentPath.color;
      ctx.lineWidth = currentPath.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);
      for (let i = 1; i < currentPath.points.length; i++) {
        ctx.lineTo(currentPath.points[i].x, currentPath.points[i].y);
      }
      ctx.stroke();
    }
    
    // Draw all shapes
    shapes.forEach((shape) => {
      ctx.strokeStyle = shape.color;
      ctx.fillStyle = shape.color;
      ctx.lineWidth = shape.lineWidth;
      ctx.beginPath();
      
      switch (shape.type) {
        case "rectangle":
          ctx.rect(shape.x, shape.y, shape.width || 0, shape.height || 0);
          ctx.stroke();
          break;
        case "circle":
          ctx.arc(shape.x, shape.y, shape.radius || 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        case "triangle":
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(shape.endX || shape.x, shape.endY || shape.y);
          ctx.lineTo(shape.x + ((shape.endX || shape.x) - shape.x) * 2, shape.y);
          ctx.closePath();
          ctx.stroke();
          break;
        case "line":
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(shape.endX || shape.x, shape.endY || shape.y);
          ctx.stroke();
          break;
        case "text":
          ctx.font = `${shape.lineWidth * 8}px Arial`;
          ctx.fillText(shape.text || "", shape.x, shape.y);
          break;
      }
      
      // Draw selection highlight
      if (shape.id === selectedShapeId) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        let highlightX = shape.x - 5;
        let highlightY = shape.y - 5;
        let highlightW = 50;
        let highlightH = 50;
        
        if (shape.type === "rectangle" && shape.width && shape.height) {
          highlightW = shape.width + 10;
          highlightH = shape.height + 10;
        } else if (shape.type === "circle" && shape.radius) {
          highlightX = shape.x - shape.radius - 5;
          highlightY = shape.y - shape.radius - 5;
          highlightW = shape.radius * 2 + 10;
          highlightH = shape.radius * 2 + 10;
        } else if (shape.type === "text") {
          highlightW = (shape.text?.length || 0) * (shape.lineWidth * 5) + 10;
          highlightH = shape.lineWidth * 8 + 10;
          highlightY = shape.y - shape.lineWidth * 8 - 5;
        }
        
        ctx.strokeRect(highlightX, highlightY, highlightW, highlightH);
        ctx.setLineDash([]);
      }
    });
    
    // Draw shape preview while drawing
    if (isDrawing && startPos && endPos && drawingMode !== "freehand" && drawingMode !== "select" && drawingMode !== "text") {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      
      switch (drawingMode) {
        case "rectangle":
          ctx.rect(
            Math.min(startPos.x, endPos.x),
            Math.min(startPos.y, endPos.y),
            Math.abs(endPos.x - startPos.x),
            Math.abs(endPos.y - startPos.y)
          );
          ctx.stroke();
          break;
        case "circle":
          const radius = Math.sqrt(
            Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
          );
          ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        case "triangle":
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(endPos.x, endPos.y);
          ctx.lineTo(startPos.x + (endPos.x - startPos.x) * 2, startPos.y);
          ctx.closePath();
          ctx.stroke();
          break;
        case "line":
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(endPos.x, endPos.y);
          ctx.stroke();
          break;
      }
    }
  }, [shapes, freehandPaths, currentPath, selectedShapeId, isDrawing, startPos, endPos, drawingMode, color, lineWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [redrawCanvas]);

  // Redraw when shapes or paths change (but not during render)
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left,
      y: "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top,
    };
  }, []);

  // Hit testing for selection
  const hitTest = useCallback((x: number, y: number): string | null => {
    // Check shapes in reverse order (top to bottom)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      let hit = false;
      
      switch (shape.type) {
        case "rectangle":
          if (shape.width && shape.height) {
            hit = x >= shape.x && x <= shape.x + shape.width &&
                  y >= shape.y && y <= shape.y + shape.height;
          }
          break;
        case "circle":
          if (shape.radius) {
            const dist = Math.sqrt(Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2));
            hit = dist <= shape.radius;
          }
          break;
        case "line":
          if (shape.endX !== undefined && shape.endY !== undefined) {
            // Simple line hit test (point to line distance)
            const dist = Math.abs(
              ((shape.endY - shape.y) * x - (shape.endX - shape.x) * y + shape.endX * shape.y - shape.endY * shape.x) /
              Math.sqrt(Math.pow(shape.endY - shape.y, 2) + Math.pow(shape.endX - shape.x, 2))
            );
            hit = dist < 5; // 5px tolerance
          }
          break;
        case "triangle":
          // Simple bounding box test for triangle
          const minX = Math.min(shape.x, shape.endX || shape.x, shape.x + ((shape.endX || shape.x) - shape.x) * 2);
          const maxX = Math.max(shape.x, shape.endX || shape.x, shape.x + ((shape.endX || shape.x) - shape.x) * 2);
          const minY = Math.min(shape.y, shape.endY || shape.y);
          const maxY = Math.max(shape.y, shape.endY || shape.y);
          hit = x >= minX && x <= maxX && y >= minY && y <= maxY;
          break;
        case "text":
          // Text bounding box (rough estimate)
          const textWidth = (shape.text?.length || 0) * (shape.lineWidth * 5);
          hit = x >= shape.x && x <= shape.x + textWidth &&
                y >= shape.y - shape.lineWidth * 8 && y <= shape.y;
          break;
      }
      
      if (hit) return shape.id;
    }
    
    return null;
  }, [shapes]);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isEnabled) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pos = getMousePos(e);
      
      // Handle select mode
      if (drawingMode === "select") {
        const hitId = hitTest(pos.x, pos.y);
        if (hitId) {
          setSelectedShapeId(hitId);
          const shape = shapes.find(s => s.id === hitId);
          if (shape) {
            setIsDragging(true);
            setDragOffset({
              x: pos.x - shape.x,
              y: pos.y - shape.y,
            });
          }
        } else {
          setSelectedShapeId(null);
        }
        return;
      }
      
      if (drawingMode === "text") {
        setTextInput({ x: pos.x, y: pos.y, text: "" });
        return;
      }

      setIsDrawing(true);
      setStartPos(pos);
      setEndPos(pos);
      
      if (drawingMode === "freehand") {
        // Start new freehand path
        setCurrentPath({
          points: [pos],
          color,
          lineWidth,
        });
        setHasContent(true);
        onDrawingChange?.(true);
      }
      // For shapes, we'll create them on stopDrawing
    },
    [isEnabled, drawingMode, getMousePos, hitTest, shapes, color, lineWidth, onDrawingChange]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isEnabled) return;

      const pos = getMousePos(e);

      // Handle dragging
      if (isDragging && selectedShapeId && dragOffset) {
        setShapes(prev => prev.map(shape => {
          if (shape.id === selectedShapeId) {
            const newX = pos.x - dragOffset.x;
            const newY = pos.y - dragOffset.y;
            return {
              ...shape,
              x: newX,
              y: newY,
              // Update end positions for line/triangle
              endX: shape.endX !== undefined ? newX + (shape.endX - shape.x) : undefined,
              endY: shape.endY !== undefined ? newY + (shape.endY - shape.y) : undefined,
            };
          }
          return shape;
        }));
        return;
      }

      if (!isDrawing || !startPos) return;

      if (drawingMode === "freehand") {
        // Add point to current path
        setCurrentPath(prev => prev ? {
          ...prev,
          points: [...prev.points, pos],
        } : null);
      } else if (drawingMode !== "select" && startPos) {
        // Update end position for shape preview
        setEndPos(pos);
      }
    },
    [isEnabled, isDrawing, startPos, drawingMode, getMousePos, isDragging, selectedShapeId, dragOffset]
  );

  const stopDrawing = useCallback((e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Handle drag end
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(null);
      return;
    }

    if (!isDrawing || !startPos) {
      setIsDrawing(false);
      setStartPos(null);
      setEndPos(null);
      return;
    }

    const pos = e ? getMousePos(e) : (endPos || startPos);

    if (drawingMode === "freehand") {
      // Finalize freehand path
      if (currentPath && currentPath.points.length > 1) {
        setFreehandPaths(prev => [...prev, currentPath]);
        setCurrentPath(null);
        setHasContent(true);
        onDrawingChange?.(true);
      }
    } else if (drawingMode !== "select" && drawingMode !== "text") {
      // Create shape object
      const shapeId = `shape-${Date.now()}-${Math.random()}`;
      const newShape: Shape = {
        id: shapeId,
        type: drawingMode,
        x: startPos.x,
        y: startPos.y,
        color,
        lineWidth,
      };

      switch (drawingMode) {
        case "rectangle":
          newShape.width = Math.abs(pos.x - startPos.x);
          newShape.height = Math.abs(pos.y - startPos.y);
          newShape.x = Math.min(startPos.x, pos.x);
          newShape.y = Math.min(startPos.y, pos.y);
          break;
        case "circle":
          newShape.radius = Math.sqrt(
            Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
          );
          break;
        case "line":
        case "triangle":
          newShape.endX = pos.x;
          newShape.endY = pos.y;
          break;
      }

      setShapes(prev => [...prev, newShape]);
      setHasContent(true);
      onDrawingChange?.(true);
    }

    setIsDrawing(false);
    setStartPos(null);
    setEndPos(null);
  }, [isDrawing, isDragging, startPos, endPos, drawingMode, currentPath, color, lineWidth, onDrawingChange, getMousePos]);

  const clearCanvas = useCallback(() => {
    setShapes([]);
    setFreehandPaths([]);
    setCurrentPath(null);
    setSelectedShapeId(null);
    setHasContent(false);
    onDrawingChange?.(false);
  }, [onDrawingChange]);

  const exportAsImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    const dataURL = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }, [hasContent]);

  const sendDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent || !onSendDrawing) return;

    const dataURL = canvas.toDataURL("image/png");
    onSendDrawing(dataURL);
    // Clear canvas after sending (optional - user can keep drawing if they want)
    // Uncomment below if you want to auto-clear after send:
    // clearCanvas();
  }, [hasContent, onSendDrawing]);

  const reviewDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent || !onReviewDrawing) return;

    const dataURL = canvas.toDataURL("image/png");
    onReviewDrawing(dataURL);
  }, [hasContent, onReviewDrawing]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 ${compact ? 'p-2' : 'p-4'} transition-colors`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="flex items-center gap-2">
          <h3 className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-900 dark:text-gray-100 transition-colors`}>Whiteboard</h3>
          {hasContent && (
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-400 dark:text-gray-500 transition-colors`}>•</span>
          )}
          {hasContent && !compact && (
            <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Drawing active</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {onReviewDrawing && (
            <button
              onClick={reviewDrawing}
              disabled={!hasContent}
              className="px-2 py-1 text-xs bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              aria-label="Review drawing"
              title="Get feedback on your drawing"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {!compact && "Review"}
            </button>
          )}
          {onSendDrawing && (
            <button
              onClick={sendDrawing}
              disabled={!hasContent}
              className="px-2 py-1 text-xs bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              aria-label="Send whiteboard to tutor"
              title="Send drawing to tutor"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {!compact && "Send"}
            </button>
          )}
          <button
            onClick={clearCanvas}
            disabled={!hasContent}
            className={`${compact ? 'px-1.5 py-1' : 'px-3 py-1.5'} text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 flex items-center gap-1.5`}
            aria-label="Clear whiteboard"
          >
            <svg className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {!compact && "Clear"}
          </button>
          {!compact && (
            <button
              onClick={exportAsImage}
              disabled={!hasContent}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 flex items-center gap-1.5"
              aria-label="Download as image"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
          )}
        </div>
      </div>

      {/* Drawing Mode Selector */}
      {!compact && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Tool:</span>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setDrawingMode("freehand")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                drawingMode === "freehand"
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title="Freehand drawing"
            >
              ✏️ Draw
            </button>
            <button
              onClick={() => setDrawingMode("line")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                drawingMode === "line"
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title="Line"
            >
              ─ Line
            </button>
            <button
              onClick={() => setDrawingMode("rectangle")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                drawingMode === "rectangle"
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title="Rectangle"
            >
              ▭ Rect
            </button>
            <button
              onClick={() => setDrawingMode("circle")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                drawingMode === "circle"
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title="Circle"
            >
              ○ Circle
            </button>
            <button
              onClick={() => setDrawingMode("triangle")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                drawingMode === "triangle"
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title="Triangle"
            >
              △ Tri
            </button>
            <button
              onClick={() => setDrawingMode("text")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                drawingMode === "text"
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title="Text label"
            >
              Aa Text
            </button>
            <button
              onClick={() => {
                setDrawingMode("select");
                setSelectedShapeId(null);
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                drawingMode === "select"
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title="Select and move"
            >
              ✋ Select
            </button>
          </div>
        </div>
      )}

      {/* Math Symbols (Quick Insert) */}
      {!compact && drawingMode === "freehand" && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Math:</span>
          <div className="flex gap-1">
            {["π", "√", "∑", "∫", "∞", "±", "×", "÷", "²", "³", "°", "∠"].map((symbol) => (
              <button
                key={symbol}
                onClick={() => {
                  // Insert symbol as text shape
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  
                  const x = canvas.width / 2;
                  const y = canvas.height / 2;
                  
                  const shapeId = `shape-${Date.now()}-${Math.random()}`;
                  const newShape: Shape = {
                    id: shapeId,
                    type: "text",
                    x,
                    y,
                    color,
                    lineWidth,
                    text: symbol,
                  };
                  setShapes(prev => [...prev, newShape]);
                  setHasContent(true);
                  onDrawingChange?.(true);
                }}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={`Insert ${symbol}`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Picker */}
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Color:</span>
          <div className="flex gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === c
                    ? "border-gray-900 dark:border-gray-200 scale-110"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Size:</span>
            <input
              type="range"
              min="1"
              max="5"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-20"
              aria-label="Line width"
            />
          </div>
        </div>
      )}

      {/* Compact Color/Size Picker */}
      {compact && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex gap-0.5">
            {colors.slice(0, 4).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border transition-all ${
                  color === c
                    ? "border-gray-900 dark:border-gray-200 scale-110"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="flex-1 h-1"
            aria-label="Line width"
          />
        </div>
      )}

      {/* Canvas */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 transition-colors relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={(e) => stopDrawing(e)}
          onMouseLeave={(e) => stopDrawing(e)}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={(e) => stopDrawing(e)}
          className={`w-full ${compact ? 'h-32' : 'h-64'} ${
            drawingMode === "text" ? "cursor-text" : 
            drawingMode === "select" ? "cursor-grab" : 
            isDragging ? "cursor-grabbing" :
            "cursor-crosshair"
          } touch-none`}
          aria-label="Whiteboard canvas"
        />
        {/* Text Input Overlay */}
        {textInput && (
          <input
            type="text"
            value={textInput.text}
            onChange={(e) => {
              setTextInput({ ...textInput, text: e.target.value });
            }}
            onBlur={() => {
              if (textInput.text) {
                // Create text shape object
                const shapeId = `shape-${Date.now()}-${Math.random()}`;
                const newShape: Shape = {
                  id: shapeId,
                  type: "text",
                  x: textInput.x,
                  y: textInput.y,
                  color,
                  lineWidth,
                  text: textInput.text,
                };
                setShapes(prev => [...prev, newShape]);
                setHasContent(true);
                onDrawingChange?.(true);
              }
              setTextInput(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                setTextInput(null);
              }
            }}
            autoFocus
            className="absolute border-2 border-blue-500 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded"
            style={{
              left: `${textInput.x}px`,
              top: `${textInput.y}px`,
            }}
          />
        )}
      </div>

      {!compact && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
          Draw diagrams, equations, or visual explanations. Click &quot;Send&quot; to share with the tutor.
        </p>
      )}
    </div>
  );
}

