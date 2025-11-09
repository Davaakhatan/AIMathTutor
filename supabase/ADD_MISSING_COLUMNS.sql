-- ============================================================================
-- Add Missing Columns to Match Code Expectations
-- ============================================================================
-- This adds columns that the code expects but weren't in COMPLETE_SCHEMA_V2
-- Run in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Fix daily_problems table
ALTER TABLE daily_problems 
  ADD COLUMN IF NOT EXISTS problem_date date;

-- Migrate data if both columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_problems' AND column_name = 'date') THEN
    UPDATE daily_problems SET problem_date = date WHERE problem_date IS NULL;
  END IF;
END $$;

-- Fix problems table - add missing columns
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS hints_used integer DEFAULT 0;

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS time_spent_seconds integer;

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS solution_steps jsonb;

-- Fix achievements table - add achievement_type as alias/copy of achievement_id
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS achievement_type text;

-- Copy achievement_id to achievement_type for existing records
UPDATE achievements 
SET achievement_type = achievement_id 
WHERE achievement_type IS NULL;

-- Create index on new columns
CREATE INDEX IF NOT EXISTS idx_problems_attempts ON problems(attempts);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);

-- Show summary
SELECT 
  'daily_problems' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'daily_problems'
  AND column_name IN ('date', 'problem_date')

UNION ALL

SELECT 
  'problems' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'problems'
  AND column_name IN ('attempts', 'hints_used', 'time_spent_seconds')

UNION ALL

SELECT 
  'achievements' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'achievements'
  AND column_name IN ('achievement_id', 'achievement_type')

ORDER BY table_name, column_name;

COMMIT;

-- ============================================================================
-- This adds:
-- - daily_problems.problem_date (code expects this)
-- - problems.attempts, hints_used, time_spent_seconds
-- - achievements.achievement_type (alias of achievement_id)
--
-- After running this, the column mismatch errors should be gone!
-- ============================================================================

