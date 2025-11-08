-- Fix xp_data table - ensure correct column names exist
-- This migration is idempotent and handles existing tables

DO $$
BEGIN
  -- Add xp_history if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'xp_data' AND column_name = 'xp_history'
  ) THEN
    ALTER TABLE xp_data ADD COLUMN xp_history JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add xp_to_next_level if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'xp_data' AND column_name = 'xp_to_next_level'
  ) THEN
    ALTER TABLE xp_data ADD COLUMN xp_to_next_level INTEGER NOT NULL DEFAULT 100;
  END IF;

  -- Ensure total_xp exists (might be named differently)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'xp_data' AND column_name = 'total_xp'
  ) THEN
    -- Check for alternative names
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'xp_data' AND column_name = 'totalXP'
    ) THEN
      ALTER TABLE xp_data RENAME COLUMN "totalXP" TO total_xp;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'xp_data' AND column_name = 'xp'
    ) THEN
      ALTER TABLE xp_data RENAME COLUMN xp TO total_xp;
    ELSE
      ALTER TABLE xp_data ADD COLUMN total_xp INTEGER NOT NULL DEFAULT 0;
    END IF;
  END IF;

  -- Ensure level exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'xp_data' AND column_name = 'level'
  ) THEN
    ALTER TABLE xp_data ADD COLUMN level INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

