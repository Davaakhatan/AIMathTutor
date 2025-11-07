-- Fix RLS infinite loop issue in referral functions
-- The issue: get_or_create_referral_code function queries referral_codes table
-- which has RLS enabled, causing potential recursion

-- Drop and recreate the function with proper RLS bypass
DROP FUNCTION IF EXISTS get_or_create_referral_code(UUID);

CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  existing_code VARCHAR(20);
  new_code VARCHAR(20);
BEGIN
  -- Check if user already has an active referral code
  -- Use SECURITY DEFINER to bypass RLS
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
  INSERT INTO referral_codes (user_id, code)
  VALUES (p_user_id, new_code)
  ON CONFLICT (user_id, code) DO NOTHING;
  
  -- If insert was skipped due to conflict, fetch the existing code
  IF NOT FOUND THEN
    SELECT code INTO existing_code
    FROM referral_codes
    WHERE user_id = p_user_id AND code = new_code AND is_active = true
    LIMIT 1;
    
    IF existing_code IS NOT NULL THEN
      RETURN existing_code;
    END IF;
  END IF;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure track_referral_signup properly bypasses RLS
DROP FUNCTION IF EXISTS track_referral_signup(VARCHAR, UUID);

CREATE OR REPLACE FUNCTION track_referral_signup(
  p_referral_code VARCHAR(20),
  p_referee_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  -- Get referrer_id from referral code (bypasses RLS due to SECURITY DEFINER)
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
  
  -- Check if user was already referred (bypasses RLS due to SECURITY DEFINER)
  IF EXISTS (SELECT 1 FROM referrals WHERE referee_id = p_referee_id) THEN
    RAISE EXCEPTION 'User already has a referral';
  END IF;
  
  -- Create referral record (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO referrals (referrer_id, referee_id, referral_code, status)
  VALUES (v_referrer_id, p_referee_id, p_referral_code, 'completed')
  RETURNING id INTO v_referral_id;
  
  -- Update referral code stats (bypasses RLS due to SECURITY DEFINER)
  UPDATE referral_codes
  SET total_signups = total_signups + 1,
      updated_at = NOW()
  WHERE code = p_referral_code;
  
  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

