import { v4 as uuidv4 } from "uuid";
import { Session, Message, ConversationContext, ParsedProblem } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Context Manager for maintaining conversation state
 * In-memory storage for MVP (can be upgraded to Redis/database later)
 */
export class ContextManager {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Clean up old sessions every 5 minutes
    setInterval(() => this.cleanupOldSessions(), 5 * 60 * 1000);
  }

  /**
   * Create a new session
   */
  createSession(problem?: ParsedProblem): Session {
    const session: Session = {
      id: uuidv4(),
      problem,
      messages: [],
      createdAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Clean up sessions that are older than timeout
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    // Collect keys first to avoid iterator issues
    for (const id of this.sessions.keys()) {
      const session = this.sessions.get(id);
      if (session && now - session.createdAt > this.SESSION_TIMEOUT) {
        toDelete.push(id);
      }
    }

    toDelete.forEach((id) => this.sessions.delete(id));
    if (toDelete.length > 0) {
      logger.debug(`Cleaned up ${toDelete.length} expired sessions`);
    }
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if session has expired
    const now = Date.now();
    if (now - session.createdAt > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      throw new Error(`Session ${sessionId} has expired`);
    }

    session.messages.push(message);
    
    // Limit message history to prevent memory issues (keep last 100 messages)
    if (session.messages.length > 100) {
      session.messages = session.messages.slice(-100);
    }
  }

  /**
   * Get conversation context for a session
   */
  getContext(sessionId: string): ConversationContext | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.problem) {
      return null;
    }

    // Check if session has expired
    const now = Date.now();
    if (now - session.createdAt > this.SESSION_TIMEOUT) {
      // Session expired, clean it up
      this.sessions.delete(sessionId);
      return null;
    }

    // Calculate stuck count (simplified: count consecutive tutor messages without progress)
    const stuckCount = this.calculateStuckCount(session.messages);

    return {
      sessionId: session.id,
      problem: session.problem,
      messages: session.messages,
      stuckCount,
      lastHintLevel: 0, // Can be enhanced later
    };
  }

  /**
   * Calculate how "stuck" the student is
   * Improved: tracks consecutive tutor messages and short/confused student responses
   */
  private calculateStuckCount(messages: Message[]): number {
    if (messages.length < 3) return 0;

    let stuckCount = 0;
    const recentMessages = messages.slice(-6); // Last 3 exchanges

    // Check for patterns indicating student is stuck
    let consecutiveTutorMessages = 0;
    let shortResponses = 0;

    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      
      if (msg.role === "tutor") {
        consecutiveTutorMessages++;
      } else if (msg.role === "user") {
        // Check if student response is very short or seems confused
        if (msg.content.length < 10 || this.isConfusedResponse(msg.content)) {
          shortResponses++;
        }
        // Reset consecutive tutor count when we see a user message
        if (consecutiveTutorMessages > 0) {
          stuckCount += Math.min(consecutiveTutorMessages - 1, 2);
        }
        consecutiveTutorMessages = 0;
      }
    }

    // Add stuck count for remaining consecutive tutor messages
    if (consecutiveTutorMessages > 1) {
      stuckCount += Math.min(consecutiveTutorMessages - 1, 2);
    }

    // Increment stuck count for short/confused responses
    if (shortResponses >= 2) {
      stuckCount += 1;
    }

    return Math.min(stuckCount, 3); // Cap at 3
  }

  /**
   * Check if a response indicates confusion
   */
  private isConfusedResponse(content: string): boolean {
    const confusedPatterns = [
      /don'?t\s+know/i,
      /no\s+idea/i,
      /confused/i,
      /stuck/i,
      /can'?t/i,
      /don'?t\s+understand/i,
      /^no$/i,
      /^yes$/i, // Very short yes/no might indicate confusion
    ];

    return confusedPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Clear a session (for cleanup)
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get all sessions (for debugging)
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

export const contextManager = new ContextManager();

