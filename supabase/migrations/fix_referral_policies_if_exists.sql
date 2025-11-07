-- Fix referral policies - drop if exists, then recreate
-- This prevents "policy already exists" errors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can create referrals on signup" ON referrals;
DROP POLICY IF EXISTS "Users can view their own referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Users can create their own referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Users can update their own referral codes" ON referral_codes;

-- Recreate RLS Policies for referrals table
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

