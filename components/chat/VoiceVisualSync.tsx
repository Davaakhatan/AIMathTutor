"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/types";
import { parseVisualReferences, visualSyncManager, VisualUpdate } from "@/lib/visualSyncManager";
import { speakNaturally } from "@/lib/voiceUtils";

interface VoiceVisualSyncProps {
  message: Message;
  onVisualUpdate?: (update: VisualUpdate) => void;
  whiteboardRef?: React.RefObject<HTMLCanvasElement>;
  isEnabled?: boolean;
}

/**
 * Component that synchronizes voice explanations with visual updates
 * When AI speaks, it triggers visual highlights, drawings, or animations
 */
export default function VoiceVisualSync({
  message,
  onVisualUpdate,
  whiteboardRef,
  isEnabled = true,
}: VoiceVisualSyncProps) {
  const syncStartedRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  useEffect(() => {
    // Only sync tutor messages
    if (!isEnabled || message.role !== "tutor" || !message.content) {
      return;
    }
    
    // Parse visual references from the message
    const visualUpdates = parseVisualReferences(message.content);
    
    if (visualUpdates.length === 0) {
      return; // No visual sync needed
    }
    
    // Start visual synchronization
    const messageId = message.id || `msg-${Date.now()}`;
    
    const handleVisualUpdate = (update: VisualUpdate) => {
      if (onVisualUpdate) {
        onVisualUpdate(update);
      }
      
      // Apply visual updates based on type
      switch (update.type) {
        case "highlight":
          // Highlight a message section or element
          highlightElement(update);
          break;
        case "draw":
          // Trigger drawing on whiteboard
          if (whiteboardRef?.current) {
            triggerDrawing(update, whiteboardRef.current);
          }
          break;
        case "animate":
          // Animate an element
          animateElement(update);
          break;
        case "show":
          // Show a hidden element
          showElement(update);
          break;
        case "hide":
          // Hide an element
          hideElement(update);
          break;
      }
    };
    
    visualSyncManager.startSync({
      messageId,
      visualUpdates,
      onUpdate: handleVisualUpdate,
    });
    
    // Cleanup on unmount
    return () => {
      visualSyncManager.stopSync(messageId);
      // Capture the current utterance ref value to avoid stale closure
      const currentUtterance = utteranceRef.current;
      if (currentUtterance) {
        window.speechSynthesis.cancel();
      }
    };
  }, [message, onVisualUpdate, whiteboardRef, isEnabled]);
  
  return null; // This component doesn't render anything
}

/**
 * Highlight an element in the message
 */
function highlightElement(update: VisualUpdate) {
  // Find text in the message that matches the target
  const messageElement = document.querySelector(`[data-message-id="${update.data?.messageId}"]`);
  if (!messageElement) return;
  
  // Create a highlight effect
  const highlight = document.createElement("span");
  highlight.className = "voice-visual-highlight";
  highlight.style.cssText = `
    background: linear-gradient(120deg, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%);
    background-repeat: no-repeat;
    background-size: 100% 0.2em;
    background-position: 0 88%;
    animation: highlightPulse 2s ease-in-out;
  `;
  
  // Add CSS animation if not already added
  if (!document.getElementById("voice-visual-sync-styles")) {
    const style = document.createElement("style");
    style.id = "voice-visual-sync-styles";
    style.textContent = `
      @keyframes highlightPulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
      .voice-visual-highlight {
        transition: all 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Trigger drawing on whiteboard
 */
function triggerDrawing(update: VisualUpdate, canvas: HTMLCanvasElement) {
  // Dispatch a custom event that the whiteboard can listen to
  const event = new CustomEvent("voice-drawing-trigger", {
    detail: {
      instruction: update.data?.instruction,
      type: update.type,
    },
  });
  canvas.dispatchEvent(event);
}

/**
 * Animate an element
 */
function animateElement(update: VisualUpdate) {
  const element = document.querySelector(`[data-visual-target="${update.target}"]`);
  if (!element) return;
  
  (element as HTMLElement).style.animation = "pulse 2s ease-in-out";
}

/**
 * Show a hidden element
 */
function showElement(update: VisualUpdate) {
  const element = document.querySelector(`[data-visual-target="${update.target}"]`);
  if (element) {
    (element as HTMLElement).style.display = "block";
    (element as HTMLElement).style.opacity = "1";
  }
}

/**
 * Hide an element
 */
function hideElement(update: VisualUpdate) {
  const element = document.querySelector(`[data-visual-target="${update.target}"]`);
  if (element) {
    (element as HTMLElement).style.opacity = "0";
    setTimeout(() => {
      (element as HTMLElement).style.display = "none";
    }, 300);
  }
}

/**
 * Speak message with visual synchronization
 */
export function speakWithVisualSync(
  message: Message,
  onVisualUpdate?: (update: VisualUpdate) => void
): void {
  if (!message.content || message.role !== "tutor") {
    return;
  }
  
  // Parse visual references
  const visualUpdates = parseVisualReferences(message.content);
  
  // Start visual sync
  if (visualUpdates.length > 0) {
    const messageId = message.id || `msg-${Date.now()}`;
    visualSyncManager.startSync({
      messageId,
      visualUpdates,
      onUpdate: onVisualUpdate,
    });
  }
  
  // Speak the message
  speakNaturally(message.content, {
    onStart: () => {
      // Visual sync starts when speech starts
      if (visualUpdates.length > 0) {
        const messageId = message.id || `msg-${Date.now()}`;
        visualSyncManager.startSync({
          messageId,
          visualUpdates,
          onUpdate: onVisualUpdate,
        });
      }
    },
    onEnd: () => {
      // Clean up visual sync after speech ends
      const messageId = message.id || `msg-${Date.now()}`;
      visualSyncManager.stopSync(messageId);
    },
  });
}

