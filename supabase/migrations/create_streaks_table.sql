-- Create streaks table for storing study streak data
-- Supports both user-level and profile-level streak tracking

-- Clean up any existing duplicate data first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'streaks') THEN
    -- Delete duplicates, keeping the most recent one
    DELETE FROM streaks s1
    WHERE EXISTS (
      SELECT 1 FROM streaks s2
      WHERE (s2.user_id = s1.user_id AND s2.student_profile_id IS NULL AND s1.student_profile_id IS NULL)
         OR (s2.student_profile_id = s1.student_profile_id AND s1.student_profile_id IS NOT NULL)
      AND s2.id != s1.id
      AND (s2.updated_at > s1.updated_at OR (s2.updated_at = s1.updated_at AND s2.id > s1.id))
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE, -- Last date when user studied
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one streak record per user or profile
  CONSTRAINT streaks_user_or_profile CHECK (
    (user_id IS NOT NULL AND student_profile_id IS NULL) OR
    (user_id IS NULL AND student_profile_id IS NOT NULL)
  )
);

-- Create unique index for user-level streaks (no profile)
CREATE UNIQUE INDEX IF NOT EXISTS idx_streaks_user_unique 
  ON streaks(user_id) 
  WHERE student_profile_id IS NULL;

-- Create unique index for profile-level streaks
CREATE UNIQUE INDEX IF NOT EXISTS idx_streaks_profile_unique 
  ON streaks(student_profile_id) 
  WHERE student_profile_id IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_profile_id ON streaks(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_streaks_updated_at ON streaks(updated_at DESC);

-- Enable RLS
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own streak data
CREATE POLICY "Users can view their own streak data"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own streak data
CREATE POLICY "Users can create their own streak data"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own streak data
CREATE POLICY "Users can update their own streak data"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_streaks_updated_at();

-- Comments
COMMENT ON TABLE streaks IS 'Stores study streak data for users and profiles';
COMMENT ON COLUMN streaks.current_streak IS 'Current consecutive days of study';
COMMENT ON COLUMN streaks.longest_streak IS 'Longest streak ever achieved';
COMMENT ON COLUMN streaks.last_study_date IS 'Last date when user studied (YYYY-MM-DD)';

