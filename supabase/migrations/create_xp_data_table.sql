-- Create xp_data table for storing XP and level data
-- Supports both user-level and profile-level XP tracking

CREATE TABLE IF NOT EXISTS xp_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  xp_history JSONB DEFAULT '[]'::jsonb, -- Array of {date, xp, reason}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one XP record per user or profile
  CONSTRAINT xp_data_user_or_profile CHECK (
    (user_id IS NOT NULL AND student_profile_id IS NULL) OR
    (user_id IS NULL AND student_profile_id IS NOT NULL)
  )
);

-- Create unique index for user-level XP (no profile)
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_data_user_unique 
  ON xp_data(user_id) 
  WHERE student_profile_id IS NULL;

-- Create unique index for profile-level XP
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_data_profile_unique 
  ON xp_data(student_profile_id) 
  WHERE student_profile_id IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_data_user_id ON xp_data(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_data_profile_id ON xp_data(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_xp_data_updated_at ON xp_data(updated_at DESC);

-- Enable RLS
ALTER TABLE xp_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own XP data
CREATE POLICY "Users can view their own XP data"
  ON xp_data FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own XP data
CREATE POLICY "Users can create their own XP data"
  ON xp_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own XP data
CREATE POLICY "Users can update their own XP data"
  ON xp_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_xp_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_xp_data_updated_at
  BEFORE UPDATE ON xp_data
  FOR EACH ROW
  EXECUTE FUNCTION update_xp_data_updated_at();

-- Comments
COMMENT ON TABLE xp_data IS 'Stores XP and level data for users and profiles';
COMMENT ON COLUMN xp_data.total_xp IS 'Total experience points earned';
COMMENT ON COLUMN xp_data.level IS 'Current level';
COMMENT ON COLUMN xp_data.xp_to_next_level IS 'XP needed to reach next level';
COMMENT ON COLUMN xp_data.xp_history IS 'Array of XP gain history entries';

