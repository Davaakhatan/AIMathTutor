/**
 * Data Migration Service
 * Migrates localStorage data to Supabase when user signs up/logs in
 */

import { getSupabaseClient } from "@/lib/supabase";
import { getAllLocalStorageData, LOCAL_STORAGE_KEYS } from "@/lib/localStorageUtils";
import { logger } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

interface MigrationResult {
  success: boolean;
  migrated: {
    xp?: boolean;
    streak?: boolean;
    problems?: boolean;
    bookmarks?: boolean;
    sessions?: boolean;
    goals?: boolean;
  };
  errors: string[];
}

/**
 * Migrate all localStorage data to Supabase for a new user
 * This is called when a user signs up to preserve their guest progress
 */
export async function migrateLocalStorageToSupabase(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrated: {},
    errors: [],
  };

  if (typeof window === "undefined") {
    return result;
  }

  try {
    const supabase = await getSupabaseClient();
    const localData = getAllLocalStorageData();

    // 1. Migrate XP Data
    if (localData[LOCAL_STORAGE_KEYS.XP_DATA]) {
      try {
        const xpData = localData[LOCAL_STORAGE_KEYS.XP_DATA];
        const { error } = await supabase
          .from("xp_data")
          .update({
            total_xp: xpData.totalXP || 0,
            level: xpData.level || 1,
            xp_to_next_level: xpData.xpToNextLevel || 100,
            xp_history: xpData.xpHistory || [],
            recent_gains: xpData.recentGains || [],
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) {
          result.errors.push(`XP migration failed: ${error.message}`);
          logger.error("XP migration error", { error, userId });
        } else {
          result.migrated.xp = true;
          logger.info("XP data migrated successfully", { userId });
        }
      } catch (error) {
        result.errors.push(`XP migration exception: ${error}`);
        logger.error("XP migration exception", { error, userId });
      }
    }

    // 2. Migrate Streak Data
    if (localData[LOCAL_STORAGE_KEYS.STREAK_DATA]) {
      try {
        const streakData = localData[LOCAL_STORAGE_KEYS.STREAK_DATA];
        const { error } = await supabase
          .from("streaks")
          .update({
            current_streak: streakData.currentStreak || 0,
            longest_streak: streakData.longestStreak || 0,
            last_study_date: streakData.lastStudyDate
              ? new Date(streakData.lastStudyDate).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) {
          result.errors.push(`Streak migration failed: ${error.message}`);
          logger.error("Streak migration error", { error, userId });
        } else {
          result.migrated.streak = true;
          logger.info("Streak data migrated successfully", { userId });
        }
      } catch (error) {
        result.errors.push(`Streak migration exception: ${error}`);
        logger.error("Streak migration exception", { error, userId });
      }
    }

    // 3. Migrate Problems (history + bookmarks)
    if (localData[LOCAL_STORAGE_KEYS.PROBLEM_HISTORY] || localData[LOCAL_STORAGE_KEYS.BOOKMARKS]) {
      try {
        const problems = localData[LOCAL_STORAGE_KEYS.PROBLEM_HISTORY] || [];
        const bookmarks = localData[LOCAL_STORAGE_KEYS.BOOKMARKS] || [];
        
        // Combine problems and bookmarks, mark bookmarked ones
        const allProblems = [
          ...problems.map((p: any) => ({ ...p, isBookmarked: false })),
          ...bookmarks.map((b: any) => ({ ...b, isBookmarked: true })),
        ];

        // Remove duplicates by text
        const uniqueProblems = Array.from(
          new Map(allProblems.map((p: any) => [p.text, p])).values()
        );

        if (uniqueProblems.length > 0) {
          const problemsToInsert = uniqueProblems.map((problem: any) => ({
            user_id: userId,
            text: problem.text || "",
            type: problem.type || "unknown",
            difficulty: problem.difficulty || null,
            image_url: problem.imageUrl || null,
            parsed_data: problem,
            is_bookmarked: problem.isBookmarked || false,
            is_generated: problem.isGenerated || false,
            source: problem.source || "upload",
            solved_at: problem.solvedAt ? new Date(problem.solvedAt).toISOString() : null,
            attempts: problem.attempts || 0,
            hints_used: problem.hintsUsed || 0,
            time_spent: problem.timeSpent || 0,
          }));

          // Insert in batches of 50 to avoid payload size limits
          const batchSize = 50;
          for (let i = 0; i < problemsToInsert.length; i += batchSize) {
            const batch = problemsToInsert.slice(i, i + batchSize);
            const { error } = await supabase.from("problems").insert(batch);

            if (error) {
              result.errors.push(`Problems migration failed (batch ${i / batchSize + 1}): ${error.message}`);
              logger.error("Problems migration error", { error, userId, batch: i / batchSize + 1 });
            }
          }

          if (problemsToInsert.length > 0) {
            result.migrated.problems = true;
            result.migrated.bookmarks = true;
            logger.info("Problems migrated successfully", { userId, count: problemsToInsert.length });
          }
        }
      } catch (error) {
        result.errors.push(`Problems migration exception: ${error}`);
        logger.error("Problems migration exception", { error, userId });
      }
    }

    // 4. Migrate Study Sessions
    if (localData[LOCAL_STORAGE_KEYS.STUDY_SESSIONS]) {
      try {
        const sessions = localData[LOCAL_STORAGE_KEYS.STUDY_SESSIONS] || [];
        
        if (sessions.length > 0) {
          const sessionsToInsert = sessions.map((session: any) => ({
            user_id: userId,
            start_time: session.startTime ? new Date(session.startTime).toISOString() : new Date().toISOString(),
            end_time: session.endTime ? new Date(session.endTime).toISOString() : null,
            duration: session.duration || 0,
            problems_solved: session.problemsSolved || 0,
          }));

          const { error } = await supabase.from("study_sessions").insert(sessionsToInsert);

          if (error) {
            result.errors.push(`Sessions migration failed: ${error.message}`);
            logger.error("Sessions migration error", { error, userId });
          } else {
            result.migrated.sessions = true;
            logger.info("Study sessions migrated successfully", { userId, count: sessionsToInsert.length });
          }
        }
      } catch (error) {
        result.errors.push(`Sessions migration exception: ${error}`);
        logger.error("Sessions migration exception", { error, userId });
      }
    }

    // 5. Migrate Daily Goals
    if (localData[LOCAL_STORAGE_KEYS.DAILY_GOALS]) {
      try {
        const goals = localData[LOCAL_STORAGE_KEYS.DAILY_GOALS];
        
        if (goals && goals.problems && goals.time) {
          const { error } = await supabase
            .from("daily_goals")
            .upsert({
              user_id: userId,
              problems_goal: goals.problems,
              time_goal: goals.time,
              date: new Date().toISOString().split("T")[0], // Today's date
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "user_id,date",
            });

          if (error) {
            result.errors.push(`Goals migration failed: ${error.message}`);
            logger.error("Goals migration error", { error, userId });
          } else {
            result.migrated.goals = true;
            logger.info("Daily goals migrated successfully", { userId });
          }
        }
      } catch (error) {
        result.errors.push(`Goals migration exception: ${error}`);
        logger.error("Goals migration exception", { error, userId });
      }
    }

    // Mark as unsuccessful if there were errors
    if (result.errors.length > 0) {
      result.success = false;
    }

    logger.info("Data migration completed", { userId, result });
    return result;
  } catch (error) {
    logger.error("Data migration failed", { error, userId });
    result.success = false;
    result.errors.push(`Migration failed: ${error}`);
    return result;
  }
}

/**
 * Check if user has existing data in Supabase
 * Returns true if user has any data (XP > 0, problems, etc.)
 */
export async function hasExistingUserData(userId: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    
    // Check XP data
    const { data: xpData } = await supabase
      .from("xp_data")
      .select("total_xp")
      .eq("user_id", userId)
      .single();

    if (xpData && xpData.total_xp > 0) {
      return true;
    }

    // Check problems
    const { data: problems } = await supabase
      .from("problems")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (problems && problems.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error("Error checking existing user data", { error, userId });
    return false;
  }
}

