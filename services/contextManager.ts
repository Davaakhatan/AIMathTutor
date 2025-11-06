import { v4 as uuidv4 } from "uuid";
import { Session, Message, ConversationContext, ParsedProblem } from "@/types";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Global session storage that persists across hot reloads in Next.js dev mode
 * This is a workaround for Next.js dev mode clearing module-level state on hot reload
 */
declare global {
  // eslint-disable-next-line no-var
  var __globalSessions: Map<string, Session> | undefined;
}

/**
 * Context Manager for maintaining conversation state
 * Hybrid storage: Supabase for authenticated users, in-memory for guests
 */
export class ContextManager {
  private sessions: Map<string, Session>; // In-memory cache for guests and quick access
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private useSupabase: boolean; // Whether to use Supabase for persistence

  constructor() {
    // Use global storage in dev mode to survive hot reloads
    // In production, use instance-level storage
    if (typeof global !== "undefined") {
      if (!global.__globalSessions) {
        global.__globalSessions = new Map();
        logger.info("Initialized global session storage");
      }
      this.sessions = global.__globalSessions;
    } else {
      this.sessions = new Map();
    }
    
    // Check if Supabase is configured
    this.useSupabase = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Clean up old sessions every 5 minutes
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanupOldSessions(), 5 * 60 * 1000);
    }
    
    logger.debug("ContextManager initialized", {
      timestamp: new Date().toISOString(),
      sessionCount: this.sessions.size,
      usingGlobalStorage: typeof global !== "undefined" && !!global.__globalSessions,
      useSupabase: this.useSupabase,
    });
  }

  /**
   * Create a new session
   * @param problem - The problem for this session
   * @param userId - Optional user ID for authenticated users (stores in Supabase)
   * @param difficultyMode - Optional difficulty mode
   */
  async createSession(
    problem?: ParsedProblem,
    userId?: string,
    difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle"
  ): Promise<Session> {
    const sessionId = uuidv4();
    const now = Date.now();
    
    const session: Session = {
      id: sessionId,
      problem,
      messages: [],
      createdAt: now,
    };

    // Store in memory cache for quick access
    this.sessions.set(session.id, session);

    // If user is authenticated and Supabase is configured, persist to database
    if (userId && this.useSupabase) {
      try {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
          logger.debug("Supabase not configured, using in-memory session only", { userId });
        } else {
          // First, save the problem if it exists
          let problemId: string | null = null;
          if (problem) {
            const { data: problemData, error: problemError } = await supabase
              .from("problems")
              .insert({
                user_id: userId,
                text: problem.text,
                type: problem.type,
                difficulty: difficultyMode,
                image_url: problem.imageUrl,
                parsed_data: problem,
                is_generated: true,
                source: "chat",
              })
              .select("id")
              .single();

            if (problemError) {
              logger.warn("Failed to save problem to database", {
                error: problemError.message,
                userId,
              });
            } else {
              problemId = problemData.id;
            }
          }

          // Create session in database
          const expiresAt = new Date(now + this.SESSION_TIMEOUT).toISOString();
          const { error: sessionError } = await supabase
            .from("sessions")
            .insert({
              id: sessionId,
              user_id: userId,
              problem_id: problemId,
              messages: [],
              context: {},
              difficulty_mode: difficultyMode,
              status: "active",
              started_at: new Date(now).toISOString(),
              last_activity: new Date(now).toISOString(),
              expires_at: expiresAt,
            });

          if (sessionError) {
            logger.warn("Failed to persist session to database", {
              error: sessionError.message,
              sessionId,
              userId,
            });
            // Continue with in-memory session even if DB save fails
          } else {
            logger.info("Session persisted to database", {
              sessionId,
              userId,
              hasProblem: !!problem,
            });
          }
        }
      } catch (error) {
        logger.error("Error persisting session to database", {
          error: error instanceof Error ? error.message : String(error),
          sessionId,
          userId,
        });
        // Continue with in-memory session
      }
    }

    logger.info("Session created", {
      sessionId: session.id,
      totalSessions: this.sessions.size,
      hasProblem: !!problem,
      userId: userId || "guest",
      persisted: !!(userId && this.useSupabase),
    });
    
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
   * @param sessionId - Session ID
   * @param userId - Optional user ID for authenticated users (loads from Supabase if not in cache)
   */
  async getSession(sessionId: string, userId?: string): Promise<Session | undefined> {
    // First check in-memory cache
    let session = this.sessions.get(sessionId);
    
    // If not found and user is authenticated, try loading from Supabase
    if (!session && userId && this.useSupabase) {
      try {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
          return undefined;
        }
        
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", sessionId)
          .eq("user_id", userId)
          .single();

        if (error || !data) {
          logger.warn("Session not found in database", {
            sessionId,
            userId,
            error: error?.message,
          });
          return undefined;
        }

        // Check if session has expired
        const expiresAt = new Date(data.expires_at).getTime();
        if (Date.now() > expiresAt) {
          logger.info("Session expired, cleaning up", { sessionId, userId });
          await this.deleteSessionFromDB(sessionId, userId);
          return undefined;
        }

        // Convert database session to Session type
        session = {
          id: data.id,
          problem: data.context?.problem || undefined,
          messages: (data.messages || []) as Message[],
          createdAt: new Date(data.started_at).getTime(),
        };

        // Cache in memory for quick access
        this.sessions.set(session.id, session);

        logger.debug("Session loaded from database", {
          sessionId,
          userId,
          messageCount: session.messages.length,
        });
      } catch (error) {
        logger.error("Error loading session from database", {
          error: error instanceof Error ? error.message : String(error),
          sessionId,
          userId,
        });
        return undefined;
      }
    }

    if (!session) {
      logger.warn("Session not found", {
        sessionId,
        userId: userId || "guest",
        totalSessions: this.sessions.size,
        allSessionIds: Array.from(this.sessions.keys()),
      });
    }
    
    return session;
  }

  /**
   * Delete session from database
   */
  private async deleteSessionFromDB(sessionId: string, userId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return;
      }
      
      await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", userId);
    } catch (error) {
      logger.error("Error deleting session from database", {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        userId,
      });
    }
  }

  /**
   * Add a message to a session
   * @param sessionId - Session ID
   * @param message - Message to add
   * @param userId - Optional user ID for authenticated users (persists to Supabase)
   */
  async addMessage(sessionId: string, message: Message, userId?: string): Promise<void> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if session has expired
    const now = Date.now();
    if (now - session.createdAt > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      if (userId && this.useSupabase) {
        await this.deleteSessionFromDB(sessionId, userId);
      }
      throw new Error(`Session ${sessionId} has expired`);
    }

    session.messages.push(message);
    
    // Limit message history to prevent memory issues (keep last 100 messages)
    if (session.messages.length > 100) {
      session.messages = session.messages.slice(-100);
    }

    // Update in-memory cache
    this.sessions.set(sessionId, session);

    // If user is authenticated, persist to database
    if (userId && this.useSupabase) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { error } = await supabase
            .from("sessions")
            .update({
              messages: session.messages,
              last_activity: new Date().toISOString(),
            })
            .eq("id", sessionId)
            .eq("user_id", userId);

          if (error) {
            logger.warn("Failed to update session in database", {
              error: error.message,
              sessionId,
              userId,
            });
            // Continue - in-memory session is still updated
          }
        }
      } catch (error) {
        logger.error("Error updating session in database", {
          error: error instanceof Error ? error.message : String(error),
          sessionId,
          userId,
        });
        // Continue - in-memory session is still updated
      }
    }
  }

  /**
   * Get conversation context for a session
   * @param sessionId - Session ID
   * @param userId - Optional user ID for authenticated users
   */
  async getContext(sessionId: string, userId?: string): Promise<ConversationContext | null> {
    const session = await this.getSession(sessionId, userId);
    if (!session || !session.problem) {
      return null;
    }

    // Check if session has expired
    const now = Date.now();
    if (now - session.createdAt > this.SESSION_TIMEOUT) {
      // Session expired, clean it up
      this.sessions.delete(sessionId);
      if (userId && this.useSupabase) {
        await this.deleteSessionFromDB(sessionId, userId);
      }
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
   * @param sessionId - Session ID
   * @param userId - Optional user ID for authenticated users
   */
  async clearSession(sessionId: string, userId?: string): Promise<void> {
    this.sessions.delete(sessionId);
    
    if (userId && this.useSupabase) {
      await this.deleteSessionFromDB(sessionId, userId);
    }
  }

  /**
   * Get all sessions (for debugging)
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

export const contextManager = new ContextManager();

