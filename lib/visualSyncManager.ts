/**
 * Visual Synchronization Manager
 * Coordinates voice explanations with visual updates (whiteboard, highlights, etc.)
 */

export interface VisualUpdate {
  type: "highlight" | "draw" | "animate" | "show" | "hide";
  target: string; // Element ID, whiteboard command, etc.
  timestamp: number; // When during speech to trigger (in milliseconds)
  duration?: number; // How long the visual effect should last
  data?: any; // Additional data for the visual update
}

export interface VisualSyncConfig {
  messageId: string;
  visualUpdates: VisualUpdate[];
  onUpdate?: (update: VisualUpdate) => void;
}

/**
 * Parse AI message for visual references and create sync timeline
 */
export function parseVisualReferences(message: string): VisualUpdate[] {
  const updates: VisualUpdate[] = [];
  const lowerMessage = message.toLowerCase();
  
  // Pattern 1: "Let's draw [something]" or "Draw [something]"
  const drawPatterns = [
    /(?:let'?s|try|we can|you can)\s+draw\s+(?:a|an)?\s*([^.!?]+?)(?:[.!?]|on|with)/gi,
    /draw\s+(?:a|an)?\s*([^.!?]+?)(?:[.!?]|on|with)/gi,
  ];
  
  drawPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      const startIndex = match.index;
      // Estimate when this would be spoken (roughly 150 words per minute)
      const wordsBefore = message.substring(0, startIndex).split(/\s+/).length;
      const estimatedTime = (wordsBefore / 150) * 60 * 1000; // milliseconds
      
      updates.push({
        type: "draw",
        target: match[1],
        timestamp: Math.max(0, estimatedTime - 500), // Start drawing slightly before mentioning
        duration: 2000,
        data: { instruction: match[1] },
      });
    }
  });
  
  // Pattern 2: "Look at [element]" or "Notice [element]"
  const highlightPatterns = [
    /(?:look\s+at|notice|see|observe|check)\s+(?:the|this|that)?\s*([^.!?]+?)(?:[.!?]|,)/gi,
    /(?:focus\s+on|pay\s+attention\s+to)\s+(?:the|this|that)?\s*([^.!?]+?)(?:[.!?]|,)/gi,
  ];
  
  highlightPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      const startIndex = match.index;
      const wordsBefore = message.substring(0, startIndex).split(/\s+/).length;
      const estimatedTime = (wordsBefore / 150) * 60 * 1000;
      
      updates.push({
        type: "highlight",
        target: match[1],
        timestamp: estimatedTime,
        duration: 3000,
        data: { element: match[1] },
      });
    }
  });
  
  // Pattern 3: "As I explain" or "Watch how" - indicates synchronized visual
  const syncPatterns = [
    /(?:as\s+I\s+explain|watch\s+how|notice\s+how|see\s+how)\s+([^.!?]+?)(?:[.!?]|,)/gi,
  ];
  
  syncPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      const startIndex = match.index;
      const wordsBefore = message.substring(0, startIndex).split(/\s+/).length;
      const estimatedTime = (wordsBefore / 150) * 60 * 1000;
      
      updates.push({
        type: "animate",
        target: match[1],
        timestamp: estimatedTime,
        duration: 4000,
        data: { description: match[1] },
      });
    }
  });
  
  // Sort by timestamp
  return updates.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Visual Sync Manager class
 */
export class VisualSyncManager {
  private activeSyncs: Map<string, NodeJS.Timeout[]> = new Map();
  private callbacks: Map<string, (update: VisualUpdate) => void> = new Map();
  
  /**
   * Start visual synchronization for a message
   */
  startSync(config: VisualSyncConfig): void {
    // Clear any existing syncs for this message
    this.stopSync(config.messageId);
    
    if (!config.visualUpdates || config.visualUpdates.length === 0) {
      return;
    }
    
    const timers: NodeJS.Timeout[] = [];
    
    config.visualUpdates.forEach(update => {
      const timer = setTimeout(() => {
        if (config.onUpdate) {
          config.onUpdate(update);
        }
        
        // Auto-cleanup after duration
        if (update.duration) {
          setTimeout(() => {
            // Remove from active syncs
            const messageTimers = this.activeSyncs.get(config.messageId);
            if (messageTimers) {
              const index = messageTimers.indexOf(timer);
              if (index > -1) {
                messageTimers.splice(index, 1);
              }
            }
          }, update.duration);
        }
      }, update.timestamp);
      
      timers.push(timer);
    });
    
    this.activeSyncs.set(config.messageId, timers);
    if (config.onUpdate) {
      this.callbacks.set(config.messageId, config.onUpdate);
    }
  }
  
  /**
   * Stop visual synchronization for a message
   */
  stopSync(messageId: string): void {
    const timers = this.activeSyncs.get(messageId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.activeSyncs.delete(messageId);
    }
    this.callbacks.delete(messageId);
  }
  
  /**
   * Stop all visual synchronizations
   */
  stopAll(): void {
    this.activeSyncs.forEach((timers) => {
      timers.forEach(timer => clearTimeout(timer));
    });
    this.activeSyncs.clear();
    this.callbacks.clear();
  }
  
  /**
   * Manually trigger a visual update
   */
  triggerUpdate(messageId: string, update: VisualUpdate): void {
    const callback = this.callbacks.get(messageId);
    if (callback) {
      callback(update);
    }
  }
}

// Singleton instance
export const visualSyncManager = new VisualSyncManager();

