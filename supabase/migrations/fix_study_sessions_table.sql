-- Fix study_sessions table - ensure correct column names exist
-- This migration is idempotent and handles existing tables

DO $$
BEGIN
  -- Add start_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_sessions' AND column_name = 'start_time'
  ) THEN
    -- Check if we can use created_at as start_time
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'study_sessions' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE study_sessions ADD COLUMN start_time TIMESTAMPTZ;
      UPDATE study_sessions SET start_time = created_at WHERE start_time IS NULL;
      ALTER TABLE study_sessions ALTER COLUMN start_time SET NOT NULL;
    ELSE
      ALTER TABLE study_sessions ADD COLUMN start_time TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
  END IF;

  -- Add end_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_sessions' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN end_time TIMESTAMPTZ;
  END IF;

  -- Add duration if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_sessions' AND column_name = 'duration'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN duration INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add problems_solved if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_sessions' AND column_name = 'problems_solved'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN problems_solved INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add xp_earned if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_sessions' AND column_name = 'xp_earned'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN xp_earned INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

