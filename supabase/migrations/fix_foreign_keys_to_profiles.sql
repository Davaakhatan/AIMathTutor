-- Fix Foreign Keys: Change all user_id references from auth.users(id) to public.profiles(id)
-- This ensures consistency across all tables and works with ensureProfileExists()

-- IMPORTANT: This migration assumes profiles exist for all users
-- Run ensureProfileExists() for all users before running this migration

-- ============================================
-- CHALLENGES TABLE
-- ============================================
-- Drop existing foreign key
ALTER TABLE IF EXISTS challenges 
  DROP CONSTRAINT IF EXISTS challenges_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS challenges 
  ADD CONSTRAINT challenges_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- DAILY_PROBLEMS_COMPLETION TABLE
-- ============================================
-- Drop existing foreign key
ALTER TABLE IF EXISTS daily_problems_completion 
  DROP CONSTRAINT IF EXISTS daily_problems_completion_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS daily_problems_completion 
  ADD CONSTRAINT daily_problems_completion_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- LEARNING_GOALS TABLE
-- ============================================
-- Drop existing foreign key
ALTER TABLE IF EXISTS learning_goals 
  DROP CONSTRAINT IF EXISTS learning_goals_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS learning_goals 
  ADD CONSTRAINT learning_goals_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- XP_DATA TABLE (if it references auth.users)
-- ============================================
-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS xp_data 
  DROP CONSTRAINT IF EXISTS xp_data_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS xp_data 
  ADD CONSTRAINT xp_data_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- STREAKS TABLE (if it references auth.users)
-- ============================================
-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS streaks 
  DROP CONSTRAINT IF EXISTS streaks_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS streaks 
  ADD CONSTRAINT streaks_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- DAILY_GOALS TABLE (if it references auth.users)
-- ============================================
-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS daily_goals 
  DROP CONSTRAINT IF EXISTS daily_goals_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS daily_goals 
  ADD CONSTRAINT daily_goals_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- STUDY_SESSIONS TABLE (if it references auth.users)
-- ============================================
-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS study_sessions 
  DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS study_sessions 
  ADD CONSTRAINT study_sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- ACHIEVEMENTS TABLE (if it references auth.users)
-- ============================================
-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS achievements 
  DROP CONSTRAINT IF EXISTS achievements_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS achievements 
  ADD CONSTRAINT achievements_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- CONVERSATION_SUMMARIES TABLE
-- ============================================
-- Drop existing foreign key
ALTER TABLE IF EXISTS conversation_summaries 
  DROP CONSTRAINT IF EXISTS conversation_summaries_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS conversation_summaries 
  ADD CONSTRAINT conversation_summaries_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- SHARES TABLE
-- ============================================
-- Drop existing foreign key
ALTER TABLE IF EXISTS shares 
  DROP CONSTRAINT IF EXISTS shares_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS shares 
  ADD CONSTRAINT shares_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- REFERRAL_CODES TABLE
-- ============================================
-- Drop existing foreign key
ALTER TABLE IF EXISTS referral_codes 
  DROP CONSTRAINT IF EXISTS referral_codes_user_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS referral_codes 
  ADD CONSTRAINT referral_codes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- REFERRALS TABLE
-- ============================================
-- Drop existing foreign keys
ALTER TABLE IF EXISTS referrals 
  DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;

ALTER TABLE IF EXISTS referrals 
  DROP CONSTRAINT IF EXISTS referrals_referee_id_fkey;

-- Add new foreign keys to profiles
ALTER TABLE IF EXISTS referrals 
  ADD CONSTRAINT referrals_referrer_id_fkey 
  FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS referrals 
  ADD CONSTRAINT referrals_referee_id_fkey 
  FOREIGN KEY (referee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- CHALLENGES TABLE - challenger_id
-- ============================================
-- Drop existing foreign key
ALTER TABLE IF EXISTS challenges 
  DROP CONSTRAINT IF EXISTS challenges_challenger_id_fkey;

-- Add new foreign key to profiles
ALTER TABLE IF EXISTS challenges 
  ADD CONSTRAINT challenges_challenger_id_fkey 
  FOREIGN KEY (challenger_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

