-- Create achievements table for tracking unlocked achievements
-- Stores which achievements users have unlocked

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL, -- 'first_problem', 'problems_10', 'streak_7', etc.
  title TEXT,
  description TEXT,
  icon TEXT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_profile_id ON achievements(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_profile ON achievements(user_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_at ON achievements(unlocked_at DESC);

-- Create unique index to prevent duplicate achievements per user/profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_unique 
  ON achievements(user_id, COALESCE(student_profile_id, '00000000-0000-0000-0000-000000000000'::uuid), achievement_type);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own achievements
CREATE POLICY "Users can create their own achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own achievements
CREATE POLICY "Users can update their own achievements"
  ON achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own achievements
CREATE POLICY "Users can delete their own achievements"
  ON achievements FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE achievements IS 'Tracks which achievements users have unlocked';
COMMENT ON COLUMN achievements.achievement_type IS 'Type of achievement: first_problem, problems_10, streak_7, etc.';

