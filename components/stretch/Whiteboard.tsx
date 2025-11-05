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
  compact = false,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [hasContent, setHasContent] = useState(false);

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

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isEnabled) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsDrawing(true);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x =
        "touches" in e
          ? e.touches[0].clientX - rect.left
          : e.clientX - rect.left;
      const y =
        "touches" in e
          ? e.touches[0].clientY - rect.top
          : e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(x, y);
      setHasContent(true);
      onDrawingChange?.(true);
    },
    [isEnabled, onDrawingChange]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isEnabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x =
        "touches" in e
          ? e.touches[0].clientX - rect.left
          : e.clientX - rect.left;
      const y =
        "touches" in e
          ? e.touches[0].clientY - rect.top
          : e.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, isEnabled]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

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
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 transition-colors">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full ${compact ? 'h-32' : 'h-64'} cursor-crosshair touch-none`}
          aria-label="Whiteboard canvas"
        />
      </div>

      {!compact && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
          Draw diagrams, equations, or visual explanations. Click "Send" to share with the tutor.
        </p>
      )}
    </div>
  );
}

