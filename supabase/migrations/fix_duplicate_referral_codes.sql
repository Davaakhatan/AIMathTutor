-- Fix duplicate active referral codes
-- This script deactivates all but the most recent active code for each user

-- First, update the function to prevent future duplicates
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
  ORDER BY created_at DESC
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

-- Clean up existing duplicates: keep only the most recent active code per user
WITH ranked_codes AS (
  SELECT 
    id,
    user_id,
    code,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM referral_codes
  WHERE is_active = true
)
UPDATE referral_codes
SET is_active = false
WHERE id IN (
  SELECT id FROM ranked_codes WHERE rn > 1
);

