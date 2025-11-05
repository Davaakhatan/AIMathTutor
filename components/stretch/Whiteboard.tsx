"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface WhiteboardProps {
  isEnabled?: boolean;
  onDrawingChange?: (hasDrawing: boolean) => void;
  onSendDrawing?: (imageDataUrl: string) => void;
  compact?: boolean; // Compact mode for sidebar integration
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
  const [drawingMode, setDrawingMode] = useState<"freehand" | "rectangle" | "circle" | "triangle" | "line" | "text">("freehand");
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; text: string } | null>(null);
  const [savedCanvasState, setSavedCanvasState] = useState<ImageData | null>(null);

  const colors = [
    "#000000", // Black
    "#2563eb", // Blue
    "#dc2626", // Red
    "#16a34a", // Green
    "#ca8a04", // Yellow
    "#9333ea", // Purple
  ];

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
      
      // Set drawing properties
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [color, lineWidth]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left,
      y: "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top,
    };
  }, []);

  const drawShape = useCallback((start: { x: number; y: number }, end: { x: number; y: number }, mode: string, isPreview: boolean = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If preview, restore saved state and draw preview
    if (isPreview && savedCanvasState) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(savedCanvasState, 0, 0);
    }
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    switch (mode) {
      case "rectangle":
        ctx.rect(
          Math.min(start.x, end.x),
          Math.min(start.y, end.y),
          Math.abs(end.x - start.x),
          Math.abs(end.y - start.y)
        );
        ctx.stroke();
        break;
      case "circle":
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case "triangle":
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(start.x + (end.x - start.x) * 2, start.y);
        ctx.closePath();
        ctx.stroke();
        break;
      case "line":
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
    }
  }, [color, lineWidth, savedCanvasState]);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isEnabled) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pos = getMousePos(e);
      
      if (drawingMode === "text") {
        setTextInput({ x: pos.x, y: pos.y, text: "" });
        return;
      }

      setIsDrawing(true);
      setStartPos(pos);
      
      if (drawingMode === "freehand") {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setHasContent(true);
        onDrawingChange?.(true);
      } else {
        // Save canvas state before drawing shape preview
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setSavedCanvasState(imageData);
      }
    },
    [isEnabled, onDrawingChange, drawingMode, getMousePos]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isEnabled || !startPos) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const pos = getMousePos(e);

      if (drawingMode === "freehand") {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        // Draw shape preview (will restore saved state)
        drawShape(startPos, pos, drawingMode, true);
      }
    },
    [isDrawing, isEnabled, startPos, drawingMode, getMousePos, drawShape]
  );

  const stopDrawing = useCallback((e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) {
      setIsDrawing(false);
      setStartPos(null);
      setSavedCanvasState(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // For shapes, finalize the drawing
    if (drawingMode !== "freehand" && savedCanvasState) {
      // Get final position
      let endPos = startPos;
      if (e) {
        endPos = getMousePos(e);
      }
      
      // Restore saved state and draw final shape
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(savedCanvasState, 0, 0);
      drawShape(startPos, endPos, drawingMode, false);
      setHasContent(true);
      onDrawingChange?.(true);
    }

    setIsDrawing(false);
    setStartPos(null);
    setSavedCanvasState(null);
  }, [isDrawing, startPos, drawingMode, savedCanvasState, onDrawingChange, getMousePos, drawShape]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
                  // Insert symbol as text
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;
                  
                  const x = canvas.width / 2;
                  const y = canvas.height / 2;
                  
                  ctx.fillStyle = color;
                  ctx.font = `${lineWidth * 8}px Arial`;
                  ctx.fillText(symbol, x, y);
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
            drawingMode === "text" ? "cursor-text" : "cursor-crosshair"
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
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                
                ctx.fillStyle = color;
                ctx.font = `${lineWidth * 8}px Arial`;
                ctx.fillText(textInput.text, textInput.x, textInput.y);
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

