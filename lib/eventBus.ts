/**
 * Event Bus - Central event system for ecosystem integration
 * Enables communication between tutoring, growth, and companion systems
 */

import { logger } from "./logger";

// Event types for the ecosystem
export type EcosystemEventType =
  // Tutoring events
  | "problem_completed"
  | "problem_started"
  | "hint_requested"
  | "session_started"
  | "session_ended"
  
  // Growth events
  | "achievement_unlocked"
  | "challenge_created"
  | "challenge_completed"
  | "share_created"
  | "referral_completed"
  
  // Companion events
  | "goal_created"
  | "goal_completed"
  | "goal_progress_updated"
  | "streak_at_risk"
  | "streak_saved"
  
  // Social events
  | "user_online"
  | "user_offline"
  | "leaderboard_rank_changed";

// Event payload structure
export interface EcosystemEvent<T = any> {
  type: EcosystemEventType;
  userId: string;
  profileId?: string | null;
  data: T;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Event handler type
export type EventHandler<T = any> = (event: EcosystemEvent<T>) => void | Promise<void>;

/**
 * Central Event Bus
 * Singleton pattern for global event coordination
 */
class EventBus {
  private handlers: Map<EcosystemEventType, Set<EventHandler>>;
  private eventHistory: EcosystemEvent[];
  private maxHistorySize: number = 100;

  constructor() {
    this.handlers = new Map();
    this.eventHistory = [];
  }

  /**
   * Subscribe to an event type
   */
  on<T = any>(eventType: EcosystemEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler as EventHandler);

    logger.debug("Event handler registered", { eventType, handlerCount: this.handlers.get(eventType)!.size });

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler);
      logger.debug("Event handler unregistered", { eventType });
    };
  }

  /**
   * Emit an event to all subscribed handlers
   */
  async emit<T = any>(
    eventType: EcosystemEventType,
    userId: string,
    data: T,
    options?: {
      profileId?: string | null;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const event: EcosystemEvent<T> = {
      type: eventType,
      userId,
      profileId: options?.profileId,
      data,
      timestamp: new Date(),
      metadata: options?.metadata,
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    logger.info("Event emitted", { 
      eventType, 
      userId, 
      profileId: options?.profileId,
      handlerCount: this.handlers.get(eventType)?.size || 0
    });

    // Call all handlers
    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.size === 0) {
      logger.debug("No handlers for event", { eventType });
      return;
    }

    // Execute handlers in parallel (they should be async-safe)
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error("Event handler error", { 
          eventType, 
          error,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get recent event history
   */
  getHistory(filter?: {
    eventType?: EcosystemEventType;
    userId?: string;
    limit?: number;
  }): EcosystemEvent[] {
    let filtered = this.eventHistory;

    if (filter?.eventType) {
      filtered = filtered.filter((e) => e.type === filter.eventType);
    }

    if (filter?.userId) {
      filtered = filtered.filter((e) => e.userId === filter.userId);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.eventHistory = [];
    logger.debug("Event bus cleared");
  }

  /**
   * Get current handler count for debugging
   */
  getHandlerCount(eventType: EcosystemEventType): number {
    return this.handlers.get(eventType)?.size || 0;
  }
}

// Singleton instance
const eventBusInstance = new EventBus();

// Export singleton (both as default and named for compatibility)
export default eventBusInstance;
export { eventBusInstance as eventBus };

// Export class for testing
export { EventBus };

// Convenience functions
export const emitEvent = eventBusInstance.emit.bind(eventBusInstance);
export const onEvent = eventBusInstance.on.bind(eventBusInstance);
export const getEventHistory = eventBusInstance.getHistory.bind(eventBusInstance);
