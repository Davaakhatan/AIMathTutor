-- Create shares table for tracking share links and conversions
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL, -- 'achievement', 'progress', 'problem', 'streak', 'challenge'
  share_code TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store share-specific data (achievement type, problem text, etc.)
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0, -- Number of signups from this share
  expires_at TIMESTAMP, -- Optional expiration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups by share_code
CREATE INDEX IF NOT EXISTS idx_shares_share_code ON shares(share_code);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at DESC);

-- Enable RLS
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own shares
CREATE POLICY "Users can view their own shares"
  ON shares FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own shares
CREATE POLICY "Users can create their own shares"
  ON shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own shares (for click tracking)
CREATE POLICY "Users can update their own shares"
  ON shares FOR UPDATE
  USING (auth.uid() = user_id);

-- Anyone can view shares by code (for deep link access)
-- This allows unauthenticated users to access share links
CREATE POLICY "Anyone can view shares by code"
  ON shares FOR SELECT
  USING (true); -- Allow public read access for deep links

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_shares_updated_at
  BEFORE UPDATE ON shares
  FOR EACH ROW
  EXECUTE FUNCTION update_shares_updated_at();

-- Add comment
COMMENT ON TABLE shares IS 'Tracks share links for viral growth features. Share codes are unique and can be accessed publicly for deep linking.';

