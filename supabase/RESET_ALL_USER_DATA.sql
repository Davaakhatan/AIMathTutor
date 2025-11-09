-- ============================================================================
-- RESET ALL USER DATA - Keep accounts, clear progress
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run"
-- 4. All user progress will be reset (XP, streaks, problems, etc.)
-- 5. User accounts (auth.users) remain intact - can still login
-- ============================================================================

-- WARNING: This will DELETE ALL user progress data!
-- User accounts will remain, but all XP, streaks, problems, etc. will be cleared

BEGIN;

-- Delete all XP data
DELETE FROM xp_data;

-- Delete all streak data
DELETE FROM streaks;

-- Delete all problems
DELETE FROM problems;

-- Delete all achievements
DELETE FROM achievements;

-- Delete all daily problems completion
DELETE FROM daily_problems_completion;

-- Delete all learning goals
DELETE FROM learning_goals;

-- Delete all conversation summaries
DELETE FROM conversation_summaries;

-- Delete all study sessions
DELETE FROM study_sessions;

-- Delete all referrals (keep referral codes)
DELETE FROM referrals;

-- Delete all challenges
DELETE FROM challenges;

-- Delete all shares
DELETE FROM shares;

-- Delete all activity events
DELETE FROM activity_events;

-- Delete all concept mastery
DELETE FROM concept_mastery;

-- Delete all daily goals
DELETE FROM daily_goals;

-- Delete all sessions
DELETE FROM sessions;

-- Delete all analytics events
DELETE FROM analytics_events;

-- Delete all leaderboard entries
DELETE FROM leaderboard;

-- Delete all notifications
DELETE FROM notifications;

-- Delete all reminders
DELETE FROM reminders;

-- Delete all study materials
DELETE FROM study_materials;

-- Delete all practice problems
DELETE FROM practice_problems;

-- Delete all tips
DELETE FROM tips;

-- Delete all formulas
DELETE FROM formulas;

-- Delete all badges
DELETE FROM badges;

-- Delete all user_badges
DELETE FROM user_badges;

-- Delete all study group memberships (keep groups themselves)
DELETE FROM study_group_members;

-- Delete all forum posts and replies
DELETE FROM forum_replies;
DELETE FROM forum_posts;

-- Delete all messages
DELETE FROM messages;

-- Show summary
SELECT 
  'XP Records' as table_name, COUNT(*) as remaining FROM xp_data
UNION ALL
SELECT 'Streaks', COUNT(*) FROM streaks
UNION ALL
SELECT 'Problems', COUNT(*) FROM problems
UNION ALL
SELECT 'Achievements', COUNT(*) FROM achievements
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
SELECT 'Activity Events', COUNT(*) FROM activity_events
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'Analytics Events', COUNT(*) FROM analytics_events
UNION ALL
SELECT 'Leaderboard', COUNT(*) FROM leaderboard
UNION ALL
SELECT 'Daily Goals', COUNT(*) FROM daily_goals
UNION ALL
SELECT 'Concept Mastery', COUNT(*) FROM concept_mastery
UNION ALL
SELECT 'Student Profiles', COUNT(*) FROM student_profiles
UNION ALL
SELECT 'User Accounts (kept)', COUNT(*) FROM profiles
UNION ALL
SELECT 'Referral Codes (kept)', COUNT(*) FROM referral_codes;

COMMIT;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- table_name              | remaining
-- ------------------------+-----------
-- XP Records              | 0
-- Streaks                 | 0
-- Problems                | 0
-- Achievements            | 0
-- Student Profiles        | 13 (kept - these are safe to keep)
-- User Accounts (kept)    | varies (all kept)
-- ============================================================================

-- ✅ DATA RESET COMPLETE!
-- Users can still login with their existing credentials
-- But all progress (XP, streaks, problems) is cleared
-- Fresh start for testing!

