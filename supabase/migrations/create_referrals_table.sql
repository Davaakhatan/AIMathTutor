-- Create referrals table for tracking referral relationships and rewards
-- This table tracks who referred whom and calculates rewards

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, rewarded
  reward_type VARCHAR(50), -- 'xp', 'streak_shield', 'ai_minutes'
  reward_amount INTEGER DEFAULT 0,
  referrer_reward_type VARCHAR(50),
  referrer_reward_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Ensure one referral per user (a user can only be referred once)
  CONSTRAINT unique_referee UNIQUE (referee_id),
  
  -- Ensure referrer and referee are different
  CONSTRAINT different_users CHECK (referrer_id != referee_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Create referral_codes table to track active referral codes per user
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_signups INTEGER DEFAULT 0,
  total_rewards_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One active code per user
  CONSTRAINT unique_user_code UNIQUE (user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
-- Users can view their own referrals (as referrer or referee)
CREATE POLICY "Users can view their own referrals"
  ON referrals
  FOR SELECT
  USING (
    auth.uid() = referrer_id OR 
    auth.uid() = referee_id
  );

-- Users can create referrals (when they sign up with a code)
CREATE POLICY "Users can create referrals on signup"
  ON referrals
  FOR INSERT
  WITH CHECK (auth.uid() = referee_id);

-- RLS Policies for referral_codes table
-- Users can view their own referral codes
CREATE POLICY "Users can view their own referral codes"
  ON referral_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own referral codes
CREATE POLICY "Users can create their own referral codes"
  ON referral_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own referral codes
CREATE POLICY "Users can update their own referral codes"
  ON referral_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  chars VARCHAR(62) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(20) := '';
  i INTEGER;
  char_index INTEGER;
BEGIN
  -- Generate 8-character code
  FOR i IN 1..8 LOOP
    char_index := floor(random() * 62)::INTEGER + 1;
    result := result || substr(chars, char_index, 1);
  END LOOP;
  
  -- Check if code already exists, regenerate if needed
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = result) LOOP
    result := '';
    FOR i IN 1..8 LOOP
      char_index := floor(random() * 62)::INTEGER + 1;
      result := result || substr(chars, char_index, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create referral code for a user
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  existing_code VARCHAR(20);
  new_code VARCHAR(20);
BEGIN
  -- Check if user already has an active referral code
  SELECT code INTO existing_code
  FROM referral_codes
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Generate new code
  new_code := generate_referral_code();
  
  -- Insert new referral code (bypasses RLS due to SECURITY DEFINER)
  -- First, deactivate any existing active codes for this user
  UPDATE referral_codes
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Then insert the new code
  INSERT INTO referral_codes (user_id, code)
  VALUES (p_user_id, new_code)
  ON CONFLICT (user_id, code) DO UPDATE SET is_active = true;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track referral signup
CREATE OR REPLACE FUNCTION track_referral_signup(
  p_referral_code VARCHAR(20),
  p_referee_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  -- Get referrer_id from referral code
  SELECT user_id INTO v_referrer_id
  FROM referral_codes
  WHERE code = p_referral_code AND is_active = true
  LIMIT 1;
  
  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_id = p_referee_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;
  
  -- Check if user was already referred
  IF EXISTS (SELECT 1 FROM referrals WHERE referee_id = p_referee_id) THEN
    RAISE EXCEPTION 'User already has a referral';
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referee_id, referral_code, status)
  VALUES (v_referrer_id, p_referee_id, p_referral_code, 'completed')
  RETURNING id INTO v_referral_id;
  
  -- Update referral code stats
  UPDATE referral_codes
  SET total_signups = total_signups + 1,
      updated_at = NOW()
  WHERE code = p_referral_code;
  
  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

