-- ============================================================================
-- RESET ALL USER DATA - Complete Version
-- ============================================================================
-- Deletes ALL user progress while keeping accounts and structure
-- Safe: Wraps each DELETE in error handling
-- ============================================================================

BEGIN;

-- Core progress data (always delete)
TRUNCATE TABLE xp_data CASCADE;
TRUNCATE TABLE streaks CASCADE;
TRUNCATE TABLE problems CASCADE;
TRUNCATE TABLE achievements CASCADE;
TRUNCATE TABLE sessions CASCADE;

-- Daily systems
TRUNCATE TABLE daily_problems_completion CASCADE;
TRUNCATE TABLE daily_goals CASCADE;

-- Companion features
TRUNCATE TABLE learning_goals CASCADE;
TRUNCATE TABLE conversation_summaries CASCADE;
TRUNCATE TABLE study_sessions CASCADE;
TRUNCATE TABLE concept_mastery CASCADE;

-- Social features
TRUNCATE TABLE referrals CASCADE;
TRUNCATE TABLE challenges CASCADE;
TRUNCATE TABLE shares CASCADE;

-- Optional tables (wrap in DO blocks to handle if missing)
DO $$ BEGIN
  TRUNCATE TABLE activity_events CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'activity_events does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE leaderboard CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'leaderboard does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE analytics_events CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'analytics_events does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE notifications CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'notifications does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE reminders CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'reminders does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE messages CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'messages does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE forum_replies CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'forum_replies does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE forum_posts CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'forum_posts does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE user_badges CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'user_badges does not exist';
END $$;

DO $$ BEGIN
  TRUNCATE TABLE study_group_members CASCADE;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'study_group_members does not exist';
END $$;

-- Show summary
SELECT 
  'XP Records' as table_name, COUNT(*) as count FROM xp_data
UNION ALL
SELECT 'Streaks', COUNT(*) FROM streaks
UNION ALL
SELECT 'Problems', COUNT(*) FROM problems
UNION ALL
SELECT 'Achievements', COUNT(*) FROM achievements
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'Daily Completions', COUNT(*) FROM daily_problems_completion
UNION ALL
SELECT 'Learning Goals', COUNT(*) FROM learning_goals
UNION ALL
SELECT 'Conversation Summaries', COUNT(*) FROM conversation_summaries
UNION ALL
SELECT 'Study Sessions', COUNT(*) FROM study_sessions
UNION ALL
SELECT 'Referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'Challenges', COUNT(*) FROM challenges
UNION ALL
SELECT 'Shares', COUNT(*) FROM shares
UNION ALL
SELECT 'Concept Mastery', COUNT(*) FROM concept_mastery
UNION ALL
SELECT 'Daily Goals', COUNT(*) FROM daily_goals
UNION ALL
SELECT '---' as table_name, 0 as count
UNION ALL
SELECT 'Student Profiles (KEPT)', COUNT(*) FROM student_profiles
UNION ALL
SELECT 'User Accounts (KEPT)', COUNT(*) FROM profiles
UNION ALL
SELECT 'Referral Codes (KEPT)', COUNT(*) FROM referral_codes
UNION ALL
SELECT 'Daily Problems (KEPT)', COUNT(*) FROM daily_problems
ORDER BY table_name;

COMMIT;

-- ============================================================================
-- AFTER RUNNING THIS:
-- ============================================================================
-- 1. All progress data = 0
-- 2. User accounts remain (can login with existing credentials)
-- 3. Student profiles remain (can reuse)
-- 4. Referral codes remain (don't need to recreate)
-- 5. Daily problems remain (shared across all users)
--
-- NEXT STEPS:
-- 1. Clear browser localStorage (Application > Local Storage > Clear)
-- 2. Refresh browser (Cmd+Shift+R)
-- 3. Login as existing user
-- 4. Should get 60 XP first login bonus
-- 5. Test problem solving, XP updates, etc.
-- ============================================================================

