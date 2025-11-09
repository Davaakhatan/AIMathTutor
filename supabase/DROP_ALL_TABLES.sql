-- ============================================================================
-- DROP ALL TABLES - Complete Database Reset
-- ============================================================================
-- WARNING: This will DELETE EVERYTHING including user accounts!
-- Only run this if you want to start completely fresh
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run"
-- 4. Then run COMPLETE_SCHEMA_V2.sql to recreate tables
-- ============================================================================

BEGIN;

-- Drop all tables in reverse dependency order

-- First: Drop tables that reference others
DROP TABLE IF EXISTS forum_replies CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS study_group_members CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS activity_events CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS concept_mastery CASCADE;
DROP TABLE IF EXISTS daily_goals CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS conversation_summaries CASCADE;
DROP TABLE IF EXISTS learning_goals CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS daily_problems_completion CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS shares CASCADE;
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS xp_data CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;

-- Then: Drop lookup/content tables
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS practice_problems CASCADE;
DROP TABLE IF EXISTS study_materials CASCADE;
DROP TABLE IF EXISTS tips CASCADE;
DROP TABLE IF EXISTS formulas CASCADE;
DROP TABLE IF EXISTS daily_problems CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;
DROP TABLE IF EXISTS shared_problems CASCADE;

-- Then: Drop relationship tables
DROP TABLE IF EXISTS profile_relationships CASCADE;

-- Then: Drop profile tables (but keep the FK constraint for now)
-- Remove the FK constraint first
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_current_student_profile;
DROP TABLE IF EXISTS student_profiles CASCADE;

-- Finally: Drop base profiles
DROP TABLE IF EXISTS profiles CASCADE;

-- Show remaining tables (should be empty or only auth tables)
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

COMMIT;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- Should show 0 tables in public schema (or only system tables)
--
-- NEXT STEPS:
-- 1. Run COMPLETE_SCHEMA_V2.sql to recreate all tables with proper structure
-- 2. This gives you a clean slate with consistent schema
-- 3. All tables will be empty and ready for testing
-- ============================================================================

-- ============================================================================
-- NOTES:
-- ============================================================================
-- This drops EVERYTHING including:
-- - All user accounts (profiles table)
-- - All student profiles
-- - All progress data
-- - All relationships
-- - All content
--
-- Auth users (auth.users table) will remain - they're in auth schema
-- But profiles table (public.profiles) links to them, so users won't be able to login
-- until you recreate the profiles table
--
-- ONLY USE THIS IF:
-- - You want to completely restart the database
-- - You're OK losing ALL data including accounts
-- - You're testing in development (not production!)
-- ============================================================================

