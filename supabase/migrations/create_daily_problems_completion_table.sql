-- Create daily_problems_completion table
-- Tracks which daily problems have been solved by users/profiles

CREATE TABLE IF NOT EXISTS daily_problems_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  problem_date DATE NOT NULL, -- YYYY-MM-DD format
  problem_text TEXT NOT NULL, -- The problem text to match
  solved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index that handles NULL values properly
-- This ensures one completion per user/profile per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_completion_unique 
  ON daily_problems_completion(user_id, COALESCE(student_profile_id, '00000000-0000-0000-0000-000000000000'::uuid), problem_date);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_completion_user_id ON daily_problems_completion(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_completion_profile_id ON daily_problems_completion(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_completion_user_profile ON daily_problems_completion(user_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_completion_date ON daily_problems_completion(problem_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_completion_user_date ON daily_problems_completion(user_id, problem_date);

-- Enable RLS
ALTER TABLE daily_problems_completion ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own completions
CREATE POLICY "Users can view their own daily problem completions"
  ON daily_problems_completion FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own completions
CREATE POLICY "Users can create their own daily problem completions"
  ON daily_problems_completion FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own completions
CREATE POLICY "Users can update their own daily problem completions"
  ON daily_problems_completion FOR UPDATE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE daily_problems_completion IS 'Tracks which daily problems have been solved by users/profiles';
COMMENT ON COLUMN daily_problems_completion.problem_date IS 'Date of the daily problem (YYYY-MM-DD format)';
COMMENT ON COLUMN daily_problems_completion.problem_text IS 'The problem text for matching purposes';

