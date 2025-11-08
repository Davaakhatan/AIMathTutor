-- Create daily_problems table
-- Stores the daily problem for each date (shared across all users)
-- This ensures everyone gets the same problem on the same day

CREATE TABLE IF NOT EXISTS daily_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_date DATE NOT NULL UNIQUE, -- YYYY-MM-DD format
  problem_text TEXT NOT NULL,
  problem_type TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- 'elementary', 'middle school', 'high school', 'advanced'
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(problem_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_problems_date ON daily_problems(problem_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_problems_type ON daily_problems(problem_type);

-- Enable RLS
ALTER TABLE daily_problems ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Everyone can read daily problems (they're shared)
CREATE POLICY "Anyone can view daily problems"
  ON daily_problems FOR SELECT
  USING (true);

-- Only service role can insert/update (via API)
-- Regular users cannot modify daily problems

-- Comments
COMMENT ON TABLE daily_problems IS 'Stores the daily problem for each date (shared across all users)';
COMMENT ON COLUMN daily_problems.problem_date IS 'Date of the daily problem (YYYY-MM-DD format)';
COMMENT ON COLUMN daily_problems.problem_text IS 'The problem text';
COMMENT ON COLUMN daily_problems.problem_type IS 'Type of problem (ARITHMETIC, ALGEBRA, etc.)';
COMMENT ON COLUMN daily_problems.difficulty IS 'Difficulty level (elementary, middle school, high school, advanced)';

