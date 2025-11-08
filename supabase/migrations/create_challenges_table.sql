-- Create challenges table for tracking challenge history
-- Challenges are problems shared between users or generated from shares
-- This tracks which challenges users have completed

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  
  -- Challenge Data
  challenge_text TEXT NOT NULL,              -- The challenge problem text
  challenge_type TEXT,                       -- Type: 'share', 'daily', 'generated', 'friend_challenge'
  problem_type TEXT,                         -- Problem type (ARITHMETIC, ALGEBRA, etc.)
  difficulty TEXT,                           -- Difficulty level
  
  -- Source Information
  share_code TEXT REFERENCES shares(share_code) ON DELETE SET NULL,  -- If from a share
  share_id UUID REFERENCES shares(id) ON DELETE SET NULL,            -- Reference to share
  challenger_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who created the challenge (if from friend)
  
  -- Completion Stats
  solved_at TIMESTAMPTZ,                    -- When the challenge was solved
  attempts INTEGER DEFAULT 0,               -- Number of attempts
  hints_used INTEGER DEFAULT 0,             -- Number of hints used
  time_spent INTEGER DEFAULT 0,             -- Time spent in seconds
  is_completed BOOLEAN DEFAULT false,       -- Whether challenge is completed
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,        -- Additional challenge data
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_profile_id ON challenges(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_challenges_share_code ON challenges(share_code);
CREATE INDEX IF NOT EXISTS idx_challenges_challenger_id ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_solved_at ON challenges(solved_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_completed ON challenges(is_completed) WHERE is_completed = true;
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON challenges(created_at DESC);

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own challenges
CREATE POLICY "Users can view their own challenges"
  ON challenges FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own challenges
CREATE POLICY "Users can create their own challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own challenges
CREATE POLICY "Users can update their own challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view challenges sent to them (by challenger_id)
CREATE POLICY "Users can view challenges sent to them"
  ON challenges FOR SELECT
  USING (auth.uid() = challenger_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenges_updated_at();

-- Comments
COMMENT ON TABLE challenges IS 'Tracks challenge history - problems users have attempted or completed from shares, daily challenges, or friend challenges';
COMMENT ON COLUMN challenges.challenge_text IS 'The challenge problem text/question';
COMMENT ON COLUMN challenges.share_code IS 'Share code if challenge came from a share link';
COMMENT ON COLUMN challenges.challenger_id IS 'User who created/sent the challenge (for friend challenges)';
COMMENT ON COLUMN challenges.is_completed IS 'Whether the challenge has been completed';

