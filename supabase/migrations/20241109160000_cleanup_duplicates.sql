-- Migration: Cleanup Duplicate XP and Streak Data
-- Purpose: Remove duplicate records and verify unique constraints
-- Date: 2025-11-09 04:00 AM

BEGIN;

-- ============================================================================
-- STEP 1: Backup existing data (optional, for safety)
-- ============================================================================
-- CREATE TABLE IF NOT EXISTS xp_data_backup AS SELECT * FROM xp_data;
-- CREATE TABLE IF NOT EXISTS streaks_backup AS SELECT * FROM streaks;

-- ============================================================================
-- STEP 2: Clean XP Data Duplicates
-- ============================================================================

-- First, let's see what we're dealing with
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, student_profile_id, COUNT(*) as cnt
    FROM xp_data
    GROUP BY user_id, student_profile_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % duplicate XP record groups', duplicate_count;
END $$;

-- Delete duplicates, keeping the most recent record
WITH ranked_xp AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, COALESCE(student_profile_id::text, 'null')
      ORDER BY updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
    ) AS rn
  FROM xp_data
)
DELETE FROM xp_data
WHERE id IN (
  SELECT id FROM ranked_xp WHERE rn > 1
);

-- Log how many we deleted
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate XP records', deleted_count;
END $$;

-- ============================================================================
-- STEP 3: Clean Streak Data Duplicates
-- ============================================================================

-- Check for duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, student_profile_id, COUNT(*) as cnt
    FROM streaks
    GROUP BY user_id, student_profile_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % duplicate streak record groups', duplicate_count;
END $$;

-- Delete duplicates, keeping the most recent record
WITH ranked_streaks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, COALESCE(student_profile_id::text, 'null')
      ORDER BY updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
    ) AS rn
  FROM streaks
)
DELETE FROM streaks
WHERE id IN (
  SELECT id FROM ranked_streaks WHERE rn > 1
);

-- Log how many we deleted
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate streak records', deleted_count;
END $$;

-- ============================================================================
-- STEP 4: Ensure Unique Constraints Exist
-- ============================================================================

-- Drop existing indexes if they exist (to recreate them properly)
DROP INDEX IF EXISTS idx_xp_data_user_unique;
DROP INDEX IF EXISTS idx_xp_data_profile_unique;
DROP INDEX IF EXISTS idx_streaks_user_unique;
DROP INDEX IF EXISTS idx_streaks_profile_unique;

-- Create unique partial indexes for XP data
-- For personal XP (no profile)
CREATE UNIQUE INDEX idx_xp_data_user_unique
  ON xp_data(user_id)
  WHERE student_profile_id IS NULL;

-- For profile-specific XP
CREATE UNIQUE INDEX idx_xp_data_profile_unique
  ON xp_data(student_profile_id)
  WHERE student_profile_id IS NOT NULL;

-- Create unique partial indexes for streaks
-- For personal streaks (no profile)
CREATE UNIQUE INDEX idx_streaks_user_unique
  ON streaks(user_id)
  WHERE student_profile_id IS NULL;

-- For profile-specific streaks
CREATE UNIQUE INDEX idx_streaks_profile_unique
  ON streaks(student_profile_id)
  WHERE student_profile_id IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE 'Unique constraints created successfully';
END $$;

-- ============================================================================
-- STEP 5: Verify No Duplicates Remain
-- ============================================================================

DO $$
DECLARE
  xp_duplicates INTEGER;
  streak_duplicates INTEGER;
BEGIN
  -- Check XP
  SELECT COUNT(*) INTO xp_duplicates
  FROM (
    SELECT user_id, student_profile_id, COUNT(*) as cnt
    FROM xp_data
    GROUP BY user_id, student_profile_id
    HAVING COUNT(*) > 1
  ) dup_xp;
  
  -- Check Streaks
  SELECT COUNT(*) INTO streak_duplicates
  FROM (
    SELECT user_id, student_profile_id, COUNT(*) as cnt
    FROM streaks
    GROUP BY user_id, student_profile_id
    HAVING COUNT(*) > 1
  ) dup_streaks;
  
  IF xp_duplicates > 0 THEN
    RAISE EXCEPTION 'Still have % XP duplicates after cleanup!', xp_duplicates;
  END IF;
  
  IF streak_duplicates > 0 THEN
    RAISE EXCEPTION 'Still have % streak duplicates after cleanup!', streak_duplicates;
  END IF;
  
  RAISE NOTICE '✅ Verification passed: No duplicates remain';
END $$;

-- ============================================================================
-- STEP 6: Show Summary
-- ============================================================================

DO $$
DECLARE
  total_xp INTEGER;
  total_streaks INTEGER;
  users_with_xp INTEGER;
  users_with_streaks INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_xp FROM xp_data;
  SELECT COUNT(*) INTO total_streaks FROM streaks;
  SELECT COUNT(DISTINCT user_id) INTO users_with_xp FROM xp_data;
  SELECT COUNT(DISTINCT user_id) INTO users_with_streaks FROM streaks;
  
  RAISE NOTICE '================================';
  RAISE NOTICE 'Database Cleanup Summary';
  RAISE NOTICE '================================';
  RAISE NOTICE 'XP Records: %', total_xp;
  RAISE NOTICE 'Streak Records: %', total_streaks;
  RAISE NOTICE 'Users with XP: %', users_with_xp;
  RAISE NOTICE 'Users with Streaks: %', users_with_streaks;
  RAISE NOTICE '================================';
END $$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration:
-- 1. Identifies duplicate records
-- 2. Keeps the most recent record (by updated_at, created_at, id)
-- 3. Deletes all other duplicates
-- 4. Creates unique partial indexes to prevent future duplicates
-- 5. Verifies no duplicates remain
-- 6. Shows a summary of the cleanup

-- After running this migration, the following should be guaranteed:
-- - Each user has exactly ONE xp_data record (where student_profile_id IS NULL)
-- - Each student_profile has exactly ONE xp_data record (where student_profile_id IS NOT NULL)
-- - Same for streaks
-- - Future attempts to insert duplicates will fail with a clear error

-- To run this migration:
-- supabase db push --dns-resolver https
-- OR run in Supabase SQL Editor

