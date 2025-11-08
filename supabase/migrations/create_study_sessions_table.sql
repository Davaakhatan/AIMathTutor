-- Create study_sessions table for storing study session data
-- Supports both user-level and profile-level session tracking

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER NOT NULL DEFAULT 0, -- in seconds
  problems_solved INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one session per user or profile
  CONSTRAINT study_sessions_user_or_profile CHECK (
    (user_id IS NOT NULL AND student_profile_id IS NULL) OR
    (user_id IS NULL AND student_profile_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_profile_id ON study_sessions(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own study sessions
CREATE POLICY "Users can view their own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own study sessions
CREATE POLICY "Users can create their own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own study sessions
CREATE POLICY "Users can update their own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own study sessions
CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_study_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_study_sessions_updated_at();

-- Comments
COMMENT ON TABLE study_sessions IS 'Stores study session data for users and profiles';
COMMENT ON COLUMN study_sessions.start_time IS 'Session start timestamp';
COMMENT ON COLUMN study_sessions.end_time IS 'Session end timestamp (null if ongoing)';
COMMENT ON COLUMN study_sessions.duration IS 'Session duration in seconds';
COMMENT ON COLUMN study_sessions.problems_solved IS 'Number of problems solved in this session';
COMMENT ON COLUMN study_sessions.xp_earned IS 'XP earned in this session';

