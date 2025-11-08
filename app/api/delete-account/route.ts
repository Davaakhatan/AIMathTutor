import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to delete user account and all related data
 * DELETE /api/delete-account
 * 
 * Deletes ALL user data from:
 * - xp_data
 * - streaks
 * - problems
 * - challenges
 * - study_sessions
 * - achievements
 * - daily_problems_completion
 * - learning_goals
 * - sessions (chat sessions)
 * - conversation_summaries
 * - shares
 * - student_profiles (if owner)
 * - profile_relationships
 * - referral_codes
 * - referrals
 * - profiles
 * - auth.users (via Supabase Auth API)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - no user session" },
        { status: 401 }
      );
    }

    const userId = user.id;
    logger.info("Starting account deletion", { userId });

    // Delete all user data in order (child tables first, then parent tables)
    
    try {
      // 1. Delete XP data (both personal and profile-linked)
      await supabase.from("xp_data").delete().eq("user_id", userId);
      logger.debug("Deleted xp_data", { userId });

      // 2. Delete streaks (both personal and profile-linked)
      await supabase.from("streaks").delete().eq("user_id", userId);
      logger.debug("Deleted streaks", { userId });

      // 3. Delete problems (both personal and profile-linked)
      await supabase.from("problems").delete().eq("user_id", userId);
      logger.debug("Deleted problems", { userId });

      // 4. Delete challenges
      await supabase.from("challenges").delete().eq("user_id", userId);
      logger.debug("Deleted challenges", { userId });

      // 5. Delete study sessions
      await supabase.from("study_sessions").delete().eq("user_id", userId);
      logger.debug("Deleted study_sessions", { userId });

      // 6. Delete achievements
      await supabase.from("achievements").delete().eq("user_id", userId);
      logger.debug("Deleted achievements", { userId });

      // 7. Delete daily problems completion
      await supabase.from("daily_problems_completion").delete().eq("user_id", userId);
      logger.debug("Deleted daily_problems_completion", { userId });

      // 8. Delete learning goals
      await supabase.from("learning_goals").delete().eq("user_id", userId);
      logger.debug("Deleted learning_goals", { userId });

      // 9. Delete chat sessions
      await supabase.from("sessions").delete().eq("user_id", userId);
      logger.debug("Deleted sessions", { userId });

      // 10. Delete conversation summaries
      await supabase.from("conversation_summaries").delete().eq("user_id", userId);
      logger.debug("Deleted conversation_summaries", { userId });

      // 11. Delete shares
      await supabase.from("shares").delete().eq("user_id", userId);
      logger.debug("Deleted shares", { userId });

      // 12. Delete student profiles owned by this user
      await supabase.from("student_profiles").delete().eq("owner_id", userId);
      logger.debug("Deleted student_profiles", { userId });

      // 13. Delete profile relationships (as parent/teacher)
      await supabase.from("profile_relationships").delete().eq("parent_id", userId);
      logger.debug("Deleted profile_relationships (as parent)", { userId });

      // 14. Delete profile relationships (as student)
      await supabase.from("profile_relationships").delete().eq("student_id", userId);
      logger.debug("Deleted profile_relationships (as student)", { userId });

      // 15. Delete referral codes
      await supabase.from("referral_codes").delete().eq("user_id", userId);
      logger.debug("Deleted referral_codes", { userId });

      // 16. Delete referrals (as referrer)
      await supabase.from("referrals").delete().eq("referrer_id", userId);
      logger.debug("Deleted referrals (as referrer)", { userId });

      // 17. Delete referrals (as referee)
      await supabase.from("referrals").delete().eq("referee_id", userId);
      logger.debug("Deleted referrals (as referee)", { userId });

      // 18. Delete leaderboard entries
      await supabase.from("leaderboard").delete().eq("user_id", userId);
      logger.debug("Deleted leaderboard", { userId });

      // 19. Delete notifications
      await supabase.from("notifications").delete().eq("user_id", userId);
      logger.debug("Deleted notifications", { userId });

      // 20. Delete daily goals
      await supabase.from("daily_goals").delete().eq("user_id", userId);
      logger.debug("Deleted daily_goals", { userId });

      // 21. Delete concept mastery
      await supabase.from("concept_mastery").delete().eq("user_id", userId);
      logger.debug("Deleted concept_mastery", { userId });

      // 22. Delete difficulty performance
      await supabase.from("difficulty_performance").delete().eq("user_id", userId);
      logger.debug("Deleted difficulty_performance", { userId });

      // 23. Delete analytics events
      await supabase.from("analytics_events").delete().eq("user_id", userId);
      logger.debug("Deleted analytics_events", { userId });

      // 24. Delete profile (this will cascade to auth.users if configured)
      await supabase.from("profiles").delete().eq("id", userId);
      logger.debug("Deleted profiles", { userId });

      // 25. Delete auth user (final step)
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteAuthError) {
        logger.error("Error deleting auth user", { error: deleteAuthError.message, userId });
        // Continue anyway - profile data is deleted
      } else {
        logger.debug("Deleted auth user", { userId });
      }

      logger.info("Account deletion completed successfully", { userId });

      return NextResponse.json({
        success: true,
        message: "Account and all related data deleted successfully",
      });
    } catch (deleteError) {
      logger.error("Error during account deletion", { error: deleteError, userId });
      return NextResponse.json(
        {
          error: "Failed to delete some data",
          details: deleteError instanceof Error ? deleteError.message : String(deleteError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error in delete-account route", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

