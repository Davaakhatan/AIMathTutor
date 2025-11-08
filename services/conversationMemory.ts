/**
 * Conversation Memory Service
 * Generates and stores conversation summaries for the Study Companion system
 * Enables AI to remember past sessions and provide personalized guidance
 */

import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";
import type { Message } from "@/types";

export interface ConversationSummary {
  id?: string;
  user_id: string;
  student_profile_id?: string | null;
  session_id?: string;
  summary: string;
  concepts_covered: string[];
  difficulty_level?: string;
  problem_types: string[];
  problems_solved: number;
  hints_given: number;
  session_duration_seconds?: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

/**
 * Generate a summary from conversation messages
 * Uses AI to extract key concepts and learning points
 */
export async function generateConversationSummary(
  messages: Message[],
  problem: {
    text: string;
    type: string;
    difficulty?: string;
  }
): Promise<Omit<ConversationSummary, "user_id" | "created_at">> {
  try {
    logger.info("Generating conversation summary", { messageCount: messages.length });

    // Extract concepts from messages (simple keyword extraction for now)
    const concepts = extractConcepts(messages);
    
    // Count problems solved in this session
    const problemsSolved = messages.filter(m => 
      m.role === "tutor" && (
        m.content.toLowerCase().includes("you solved") ||
        m.content.toLowerCase().includes("correct") ||
        m.content.toLowerCase().includes("well done")
      )
    ).length;

    // Count hints
    const hints = messages.filter(m =>
      m.role === "tutor" && m.content.toLowerCase().includes("hint")
    ).length;

    // Generate natural language summary
    const summary = generateNaturalSummary(messages, problem, concepts);

    return {
      summary,
      concepts_covered: concepts,
      difficulty_level: problem.difficulty || "middle",
      problem_types: [problem.type],
      problems_solved: Math.max(1, problemsSolved),
      hints_given: hints,
      metadata: {
        total_messages: messages.length,
        user_messages: messages.filter(m => m.role === "user").length,
        tutor_messages: messages.filter(m => m.role === "tutor").length,
      },
    };
  } catch (error) {
    logger.error("Error generating conversation summary", { error });
    throw error;
  }
}

/**
 * Save conversation summary to database
 */
export async function saveConversationSummary(
  userId: string,
  summaryData: Omit<ConversationSummary, "user_id" | "created_at">,
  profileId?: string | null
): Promise<string | null> {
  try {
    logger.info("Saving conversation summary", { userId, profileId });

    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const insertData: any = {
      user_id: userId,
      student_profile_id: profileId,
      ...summaryData,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("conversation_summaries")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    logger.info("Conversation summary saved", { userId, summaryId: data.id });
    return data.id;
  } catch (error) {
    logger.error("Error saving conversation summary", { error, userId });
    return null;
  }
}

/**
 * Get recent conversation summaries for a user
 */
export async function getRecentSummaries(
  userId: string,
  profileId?: string | null,
  limit: number = 5
): Promise<ConversationSummary[]> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return [];
    }

    let query = supabase
      .from("conversation_summaries")
      .select("*")
      .eq("user_id", userId);

    if (profileId) {
      query = query.eq("student_profile_id", profileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error fetching conversation summaries", { error, userId });
    return [];
  }
}

/**
 * Get summary context for next session
 * Returns a formatted string to include in AI prompt
 */
export async function getSummaryContext(
  userId: string,
  profileId?: string | null
): Promise<string> {
  try {
    const summaries = await getRecentSummaries(userId, profileId, 3);
    
    if (summaries.length === 0) {
      return "";
    }

    const context = summaries
      .map((s, i) => {
        const timeAgo = getTimeAgo(new Date(s.created_at || ""));
        return `${i + 1}. ${timeAgo}: ${s.summary} (Concepts: ${s.concepts_covered.join(", ")})`;
      })
      .join("\n");

    return `\n\nPrevious Sessions:\n${context}\n`;
  } catch (error) {
    logger.error("Error getting summary context", { error, userId });
    return "";
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract mathematical concepts from conversation
 */
function extractConcepts(messages: Message[]): string[] {
  const concepts = new Set<string>();
  
  const conceptKeywords = {
    "algebra": ["variable", "equation", "solve for", "x =", "y ="],
    "geometry": ["area", "volume", "perimeter", "angle", "triangle", "circle", "square"],
    "arithmetic": ["add", "subtract", "multiply", "divide", "sum", "difference"],
    "fractions": ["fraction", "numerator", "denominator", "half", "third", "quarter"],
    "percentages": ["percent", "%", "percentage"],
    "exponents": ["power", "exponent", "squared", "cubed", "^"],
    "calculus": ["derivative", "integral", "limit", "slope"],
    "statistics": ["mean", "median", "average", "probability"],
  };

  const allText = messages.map(m => m.content.toLowerCase()).join(" ");

  for (const [concept, keywords] of Object.entries(conceptKeywords)) {
    if (keywords.some(keyword => allText.includes(keyword))) {
      concepts.add(concept);
    }
  }

  return Array.from(concepts);
}

/**
 * Generate natural language summary
 */
function generateNaturalSummary(
  messages: Message[],
  problem: { text: string; type: string; difficulty?: string },
  concepts: string[]
): string {
  const userMessages = messages.filter(m => m.role === "user");
  const problemType = problem.type || "math";
  const conceptList = concepts.length > 0 ? concepts.join(", ") : problemType;

  // Simple template-based summary (can be enhanced with AI later)
  const summary = `Worked on ${problem.difficulty || "middle"} school ${problemType} problem. ` +
    `Covered concepts: ${conceptList}. ` +
    `Student engaged with ${userMessages.length} responses.`;

  return summary;
}

/**
 * Get human-readable time ago
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

