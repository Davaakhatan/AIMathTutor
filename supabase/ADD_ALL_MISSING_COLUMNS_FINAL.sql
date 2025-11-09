-- ============================================================================
-- Add ALL Missing Columns - Final Fix
-- ============================================================================
-- Run in Supabase SQL Editor
-- This adds every column the code expects but the schema doesn't have
-- ============================================================================

BEGIN;

-- Remove problematic trigger and view first
DROP TRIGGER IF EXISTS trigger_refresh_leaderboard ON xp_data;
DROP FUNCTION IF EXISTS auto_refresh_leaderboard() CASCADE;
DROP FUNCTION IF EXISTS refresh_leaderboard() CASCADE;
DROP MATERIALIZED VIEW IF EXISTS leaderboard_cache CASCADE;

-- Fix: daily_problems
ALTER TABLE daily_problems
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS hints jsonb DEFAULT '[]';

-- Fix: sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS context jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_activity timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS problem_text text,
  ADD COLUMN IF NOT EXISTS problem_type text;

-- Fix: daily_problems_completion  
ALTER TABLE daily_problems_completion
  ADD COLUMN IF NOT EXISTS problem_text text,
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(id) ON DELETE CASCADE;

-- Fix: problems (time_spent already added earlier)
-- Nothing needed here

-- Show summary
SELECT 
  'Columns Added' as status,
  'daily_problems: topic, subject, hints' as detail
UNION ALL
SELECT 'Columns Added', 'sessions: context, last_activity, problem_text, problem_type'
UNION ALL
SELECT 'Columns Added', 'daily_problems_completion: problem_text, session_id'
UNION ALL
SELECT 'Trigger Removed', 'auto_refresh_leaderboard (was causing locks)'
UNION ALL
SELECT 'View Removed', 'leaderboard_cache (was causing locks)';

COMMIT;

-- ============================================================================
-- After running this:
-- 1. All column mismatch errors should be gone
-- 2. Daily problems can save to database
-- 3. Sessions can persist
-- 4. No more materialized view locks
--
-- Next: Fix the profileId bug in code (students passing profile ID instead of null)
-- ============================================================================

