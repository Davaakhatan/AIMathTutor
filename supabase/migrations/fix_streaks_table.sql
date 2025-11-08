-- Fix streaks table - handle duplicate data before creating unique index
-- This migration is idempotent and handles existing tables

-- First, ensure the table exists with correct columns
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'streaks' AND column_name = 'current_streak'
  ) THEN
    ALTER TABLE streaks ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'streaks' AND column_name = 'longest_streak'
  ) THEN
    ALTER TABLE streaks ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'streaks' AND column_name = 'last_study_date'
  ) THEN
    ALTER TABLE streaks ADD COLUMN last_study_date DATE;
  END IF;
END $$;

-- Clean up duplicate user-level streaks (keep the most recent one)
DELETE FROM streaks s1
WHERE s1.student_profile_id IS NULL
  AND EXISTS (
    SELECT 1 FROM streaks s2
    WHERE s2.user_id = s1.user_id
      AND s2.student_profile_id IS NULL
      AND s2.id != s1.id
      AND s2.updated_at > s1.updated_at
  );

-- Clean up duplicate profile-level streaks (keep the most recent one)
DELETE FROM streaks s1
WHERE s1.student_profile_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM streaks s2
    WHERE s2.student_profile_id = s1.student_profile_id
      AND s2.id != s1.id
      AND s2.updated_at > s1.updated_at
  );

-- Now create unique indexes (they should work after cleanup)
DROP INDEX IF EXISTS idx_streaks_user_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_streaks_user_unique 
  ON streaks(user_id) 
  WHERE student_profile_id IS NULL;

DROP INDEX IF EXISTS idx_streaks_profile_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_streaks_profile_unique 
  ON streaks(student_profile_id) 
  WHERE student_profile_id IS NOT NULL;

