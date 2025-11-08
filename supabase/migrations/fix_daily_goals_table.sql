-- Fix daily_goals table - ensure correct column names exist
-- This migration is idempotent and handles existing tables

-- First, check if table exists and add missing columns
DO $$
BEGIN
  -- Add problems_goal if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_goals' AND column_name = 'problems_goal'
  ) THEN
    -- Check if old column name exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'daily_goals' AND column_name = 'problems'
    ) THEN
      ALTER TABLE daily_goals RENAME COLUMN problems TO problems_goal;
    ELSE
      ALTER TABLE daily_goals ADD COLUMN problems_goal INTEGER NOT NULL DEFAULT 5;
    END IF;
  END IF;

  -- Add time_goal if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_goals' AND column_name = 'time_goal'
  ) THEN
    -- Check if old column name exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'daily_goals' AND column_name = 'time'
    ) THEN
      ALTER TABLE daily_goals RENAME COLUMN time TO time_goal;
    ELSE
      ALTER TABLE daily_goals ADD COLUMN time_goal INTEGER NOT NULL DEFAULT 30;
    END IF;
  END IF;

  -- Add problems_completed if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_goals' AND column_name = 'problems_completed'
  ) THEN
    ALTER TABLE daily_goals ADD COLUMN problems_completed INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add time_completed if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_goals' AND column_name = 'time_completed'
  ) THEN
    ALTER TABLE daily_goals ADD COLUMN time_completed INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

