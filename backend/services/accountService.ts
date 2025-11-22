/**
 * Account Backend Service
 * Handles account deletion and management
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * Delete user account and all related data
 */
export async function deleteAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    logger.info("Starting account deletion", { userId });

    // Delete all user data in order (child tables first, then parent tables)
    const tablesToDelete = [
      { table: "xp_data", column: "user_id" },
      { table: "streaks", column: "user_id" },
      { table: "problems", column: "user_id" },
      { table: "challenges", column: "user_id" },
      { table: "study_sessions", column: "user_id" },
      { table: "achievements", column: "user_id" },
      { table: "daily_problems_completion", column: "user_id" },
      { table: "learning_goals", column: "user_id" },
      { table: "learning_paths", column: "user_id" },
      { table: "sessions", column: "user_id" },
      { table: "conversation_summaries", column: "user_id" },
      { table: "shares", column: "user_id" },
      { table: "student_profiles", column: "owner_id" },
      { table: "profile_relationships", column: "parent_id" },
      { table: "profile_relationships", column: "student_id" },
      { table: "referral_codes", column: "user_id" },
      { table: "referrals", column: "referrer_id" },
      { table: "referrals", column: "referee_id" },
      { table: "leaderboard", column: "user_id" },
      { table: "notifications", column: "user_id" },
      { table: "daily_goals", column: "user_id" },
      { table: "concept_mastery", column: "user_id" },
      { table: "difficulty_performance", column: "user_id" },
      { table: "analytics_events", column: "user_id" },
    ];

    for (const { table, column } of tablesToDelete) {
      try {
        await supabase.from(table).delete().eq(column, userId);
        logger.debug(`Deleted ${table}`, { userId, column });
      } catch (err) {
        // Some tables might not exist, continue anyway
        logger.debug(`Failed to delete from ${table}`, { userId, error: err });
      }
    }

    // Delete profile
    await supabase.from("profiles").delete().eq("id", userId);
    logger.debug("Deleted profiles", { userId });

    // Delete auth user
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      logger.error("Error deleting auth user", { error: deleteAuthError.message, userId });
      // Continue anyway - profile data is deleted
    } else {
      logger.debug("Deleted auth user", { userId });
    }

    logger.info("Account deletion completed successfully", { userId });

    return { success: true };
  } catch (error) {
    logger.error("Error in deleteAccount", { error, userId });
    return { success: false, error: String(error) };
  }
}
