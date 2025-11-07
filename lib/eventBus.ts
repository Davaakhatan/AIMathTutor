/**
 * Event Bus - Central nervous system for ecosystem communication
 * 
 * This event bus enables decoupled communication between:
 * - Core Tutoring System
 * - Growth System
 * - Study Companion System
 * - Gamification System
 */

import type { Event, EventType, EventHandler, EventSubscriptionOptions } from "@/types/events";
import { logger } from "./logger";

class EventBus {
  private handlers: Map<EventType, Array<{ handler: EventHandler; options?: EventSubscriptionOptions }>> = new Map();
  private eventHistory: Event[] = [];
  private maxHistorySize = 100; // Keep last 100 events for debugging

  /**
   * Emit an event to all registered handlers
   */
  async emit(event: Event): Promise<void> {
    // Ensure timestamp is set
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Add to history (for debugging)
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get handlers for this event type
    const handlers = this.handlers.get(event.type) || [];
    
    if (handlers.length === 0) {
      logger.debug(`No handlers registered for event type: ${event.type}`);
      return;
    }

    logger.info(`Emitting event: ${event.type}`, {
      userId: event.userId,
      profileId: event.profileId,
      eventType: event.type,
    });

    // Execute all handlers in parallel
    const handlerPromises = handlers.map(async ({ handler, options }) => {
      try {
        // Apply filter if provided
        if (options?.filter && !options.filter(event)) {
          return;
        }

        // Execute handler
        await handler(event);

        // Remove handler if it's a "once" subscription
        if (options?.once) {
          this.off(event.type, handler);
        }
      } catch (error) {
        logger.error(`Error in event handler for ${event.type}`, {
          error,
          event,
          handler: handler.name || "anonymous",
        });
        // Don't throw - continue with other handlers
      }
    });

    await Promise.all(handlerPromises);
  }

  /**
   * Subscribe to an event type
   */
  on(
    eventType: EventType,
    handler: EventHandler,
    options?: EventSubscriptionOptions
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const handlers = this.handlers.get(eventType)!;
    
    // Check if handler is already registered
    const exists = handlers.some((h) => h.handler === handler);
    if (exists) {
      logger.warn(`Handler already registered for event type: ${eventType}`);
      return;
    }

    handlers.push({ handler, options });
    logger.debug(`Registered handler for event type: ${eventType}`, {
      totalHandlers: handlers.length,
    });
  }

  /**
   * Unsubscribe from an event type
   */
  off(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) {
      return;
    }

    const index = handlers.findIndex((h) => h.handler === handler);
    if (index > -1) {
      handlers.splice(index, 1);
      logger.debug(`Unregistered handler for event type: ${eventType}`, {
        remainingHandlers: handlers.length,
      });
    }
  }

  /**
   * Subscribe to an event type, but only fire once
   */
  once(eventType: EventType, handler: EventHandler): void {
    this.on(eventType, handler, { once: true });
  }

  /**
   * Get event history (for debugging)
   */
  getHistory(limit?: number): Event[] {
    const events = [...this.eventHistory];
    if (limit) {
      return events.slice(-limit);
    }
    return events;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get handler count for an event type (for debugging)
   */
  getHandlerCount(eventType: EventType): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  /**
   * Get all registered event types (for debugging)
   */
  getRegisteredEventTypes(): EventType[] {
    return Array.from(this.handlers.keys());
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Export for testing
export { EventBus };

