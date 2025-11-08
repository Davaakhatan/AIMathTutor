-- Create daily_goals table for storing daily learning goals
-- Supports both user-level and profile-level goal tracking

-- Drop table if it exists with wrong schema (only in development)
-- DO $$ BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_goals') THEN
--     DROP TABLE IF EXISTS daily_goals CASCADE;
--   END IF;
-- END $$;

CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- YYYY-MM-DD format
  problems_goal INTEGER NOT NULL DEFAULT 5,
  time_goal INTEGER NOT NULL DEFAULT 30, -- in minutes
  problems_completed INTEGER NOT NULL DEFAULT 0,
  time_completed INTEGER NOT NULL DEFAULT 0, -- in minutes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one goal per user/profile per date
  CONSTRAINT daily_goals_user_or_profile CHECK (
    (user_id IS NOT NULL AND student_profile_id IS NULL) OR
    (user_id IS NULL AND student_profile_id IS NOT NULL)
  )
);

-- Create unique index for user-level goals (no profile)
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_goals_user_date_unique 
  ON daily_goals(user_id, date) 
  WHERE student_profile_id IS NULL;

-- Create unique index for profile-level goals
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_goals_profile_date_unique 
  ON daily_goals(student_profile_id, date) 
  WHERE student_profile_id IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_id ON daily_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_profile_id ON daily_goals(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_goals_updated_at ON daily_goals(updated_at DESC);

-- Enable RLS
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own daily goals
CREATE POLICY "Users can view their own daily goals"
  ON daily_goals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own daily goals
CREATE POLICY "Users can create their own daily goals"
  ON daily_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own daily goals
CREATE POLICY "Users can update their own daily goals"
  ON daily_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own daily goals
CREATE POLICY "Users can delete their own daily goals"
  ON daily_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_daily_goals_updated_at
  BEFORE UPDATE ON daily_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_goals_updated_at();

-- Comments
COMMENT ON TABLE daily_goals IS 'Stores daily learning goals for users and profiles';
COMMENT ON COLUMN daily_goals.date IS 'Date of the goal (YYYY-MM-DD format)';
COMMENT ON COLUMN daily_goals.problems_goal IS 'Target number of problems to solve';
COMMENT ON COLUMN daily_goals.time_goal IS 'Target study time in minutes';
COMMENT ON COLUMN daily_goals.problems_completed IS 'Number of problems solved';
COMMENT ON COLUMN daily_goals.time_completed IS 'Time spent studying in minutes';

