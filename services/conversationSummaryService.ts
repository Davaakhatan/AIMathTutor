/**
 * Conversation Summary Service
 * Handles AI-generated summaries of tutoring sessions for persistent memory
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOpenAI } from "@/lib/openai";
import { logger } from "@/lib/logger";
import type { Message } from "@/types";

export interface ConversationSummary {
  id: string;
  user_id: string;
  student_profile_id: string | null;
  session_id: string | null;
  summary: string;
  concepts_covered: string[];
  difficulty_level: string | null;
  problem_types: string[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface SummaryInput {
  messages: Message[];
  problemText?: string;
  problemType?: string;
  difficultyLevel?: string;
  hintsUsed?: number;
  timeSpent?: number;
  attempts?: number;
}

/**
 * Generate a summary of a conversation using OpenAI
 */
export async function summarizeSession(
  userId: string,
  profileId: string | null,
  sessionId: string,
  input: SummaryInput
): Promise<ConversationSummary | null> {
  try {
    const openai = getOpenAI();
    if (!openai) {
      logger.error("OpenAI client not available for summarization");
      return null;
    }

    // Build conversation text for summarization
    const conversationText = input.messages
      .map((msg) => `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`)
      .join("\n\n");

    // Create summary prompt
    const summaryPrompt = `You are summarizing a math tutoring session. Create a concise summary that captures:
1. The main problem or topic discussed
2. Key mathematical concepts covered
3. The student's understanding level
4. Any areas where the student struggled or excelled

Conversation:
${conversationText}

${input.problemText ? `Problem: ${input.problemText}` : ""}
${input.problemType ? `Problem Type: ${input.problemType}` : ""}
${input.difficultyLevel ? `Difficulty: ${input.difficultyLevel}` : ""}
${input.hintsUsed !== undefined ? `Hints Used: ${input.hintsUsed}` : ""}
${input.timeSpent !== undefined ? `Time Spent: ${Math.round(input.timeSpent / 1000)} seconds` : ""}

Provide a summary in the following JSON format:
{
  "summary": "A 2-3 sentence summary of the session",
  "concepts": ["concept1", "concept2", ...],
  "problem_types": ["type1", "type2", ...],
  "student_understanding": "struggling" | "developing" | "proficient" | "mastered"
}`;

    // Call OpenAI for summarization
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use cheaper model for summarization
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that summarizes math tutoring sessions. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: summaryPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent summaries
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error("OpenAI returned empty summary");
      return null;
    }

    // Parse JSON response
    let summaryData: {
      summary: string;
      concepts: string[];
      problem_types: string[];
      student_understanding?: string;
    };

    try {
      summaryData = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse summary JSON", { content, error: parseError });
      // Fallback: create a simple summary
      summaryData = {
        summary: `Session covered ${input.problemType || "math problem"}. ${input.messages.length} messages exchanged.`,
        concepts: input.problemType ? [input.problemType] : [],
        problem_types: input.problemType ? [input.problemType] : [],
      };
    }

    // Extract concepts from problem type if not provided
    const concepts = summaryData.concepts.length > 0
      ? summaryData.concepts
      : input.problemType
      ? [input.problemType]
      : [];

    // Extract problem types
    const problemTypes = summaryData.problem_types.length > 0
      ? summaryData.problem_types
      : input.problemType
      ? [input.problemType]
      : [];

    // Store summary in database
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error("Supabase admin client not available for saving summary");
      return null;
    }
    const { data, error } = await supabase
      .from("conversation_summaries")
      .insert({
        user_id: userId,
        student_profile_id: profileId,
        session_id: sessionId,
        summary: summaryData.summary,
        concepts_covered: concepts,
        difficulty_level: input.difficultyLevel || null,
        problem_types: problemTypes,
        metadata: {
          hints_used: input.hintsUsed || 0,
          time_spent: input.timeSpent || 0,
          attempts: input.attempts || 0,
          student_understanding: summaryData.student_understanding || "developing",
          message_count: input.messages.length,
        },
      })
      .select()
      .single();

    if (error) {
      // Enhanced error logging
      console.error("❌ FAILED TO SAVE CONVERSATION SUMMARY:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.code === "42P01" ? "⚠️ TABLE MISSING: Run migration: supabase/migrations/create_conversation_summaries_table.sql" : undefined
      });
      
      logger.error("Error saving conversation summary", { 
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        userId, 
        sessionId,
        hint: error.code === "42P01" ? "Table 'conversation_summaries' does not exist. Run SQL migration: create_conversation_summaries_table.sql" : undefined
      });
      
      return null;
    }

    console.log("💾 CONVERSATION SUMMARY SAVED TO DATABASE!", {
      summaryId: data.id,
      userId,
      sessionId,
      conceptsCount: concepts.length,
    });

    logger.info("Conversation summary created", {
      summaryId: data.id,
      userId,
      sessionId,
      conceptsCount: concepts.length,
    });

    return data as ConversationSummary;
  } catch (error) {
    logger.error("Error in summarizeSession", { error, userId, sessionId });
    return null;
  }
}

/**
 * Get conversation summaries for a user
 */
export async function getSummaries(
  userId: string,
  profileId?: string | null,
  limit: number = 10
): Promise<ConversationSummary[]> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error("Supabase admin client not available for fetching summaries");
      return [];
    }

    let query = supabase
      .from("conversation_summaries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (profileId !== undefined) {
      if (profileId === null) {
        query = query.is("student_profile_id", null);
      } else {
        query = query.eq("student_profile_id", profileId);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching conversation summaries", { error: error.message, userId });
      return [];
    }

    return (data || []) as ConversationSummary[];
  } catch (error) {
    logger.error("Error in getSummaries", { error, userId });
    return [];
  }
}

/**
 * Get the most recent summary for context
 */
export async function getLatestSummary(
  userId: string,
  profileId?: string | null
): Promise<ConversationSummary | null> {
  const summaries = await getSummaries(userId, profileId, 1);
  return summaries.length > 0 ? summaries[0] : null;
}

/**
 * Get summaries related to a specific concept
 */
export async function getSummariesByConcept(
  userId: string,
  concept: string,
  profileId?: string | null,
  limit: number = 5
): Promise<ConversationSummary[]> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error("Supabase admin client not available for fetching summaries");
      return [];
    }

    let query = supabase
      .from("conversation_summaries")
      .select("*")
      .eq("user_id", userId)
      .contains("concepts_covered", [concept])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (profileId !== undefined) {
      if (profileId === null) {
        query = query.is("student_profile_id", null);
      } else {
        query = query.eq("student_profile_id", profileId);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching summaries by concept", { error: error.message, userId, concept });
      return [];
    }

    return (data || []) as ConversationSummary[];
  } catch (error) {
    logger.error("Error in getSummariesByConcept", { error, userId, concept });
    return [];
  }
}

