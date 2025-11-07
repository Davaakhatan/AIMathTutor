-- Create learning_goals table for Study Companion
-- Stores user learning goals and tracks progress

CREATE TABLE IF NOT EXISTS learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- 'subject_mastery', 'exam_prep', 'skill_building', 'practice_hours'
  target_subject TEXT NOT NULL, -- 'Algebra', 'Geometry', 'SAT', 'AP Calculus', etc.
  target_date DATE, -- Optional target completion date
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
  progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional goal data (target_score, hours_goal, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ -- When goal was completed
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON learning_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_profile_id ON learning_goals(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_profile ON learning_goals(user_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON learning_goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON learning_goals(created_at DESC);

-- Enable RLS
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own goals
CREATE POLICY "Users can view their own goals"
  ON learning_goals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own goals
CREATE POLICY "Users can create their own goals"
  ON learning_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update their own goals"
  ON learning_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own goals
CREATE POLICY "Users can delete their own goals"
  ON learning_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learning_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_learning_goals_updated_at
  BEFORE UPDATE ON learning_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_goals_updated_at();

-- Comments
COMMENT ON TABLE learning_goals IS 'Stores user learning goals and tracks progress for Study Companion';
COMMENT ON COLUMN learning_goals.goal_type IS 'Type of goal: subject_mastery, exam_prep, skill_building, practice_hours';
COMMENT ON COLUMN learning_goals.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN learning_goals.metadata IS 'Additional goal data (target_score, hours_goal, problems_to_solve, etc.)';

