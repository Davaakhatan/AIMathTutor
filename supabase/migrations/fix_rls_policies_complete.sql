-- ============================================
-- Complete Fix for RLS Policies
-- ============================================
-- This migration completely fixes all RLS policies for profile-based queries
-- Fixes 406 errors when querying by student_profile_id
-- ============================================

-- ============================================
-- XP DATA POLICIES
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own XP" ON public.xp_data;
DROP POLICY IF EXISTS "Users can update own XP" ON public.xp_data;
DROP POLICY IF EXISTS "Users can create own XP" ON public.xp_data;

-- SELECT: Users can view their own XP (user_id) OR XP for their student profiles
CREATE POLICY "Users can view own XP" ON public.xp_data
  FOR SELECT USING (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- INSERT: Users can create XP for themselves OR for their student profiles
CREATE POLICY "Users can create own XP" ON public.xp_data
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- UPDATE: Users can update their own XP OR XP for their student profiles
CREATE POLICY "Users can update own XP" ON public.xp_data
  FOR UPDATE USING (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- ============================================
-- STREAKS POLICIES
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own streaks" ON public.streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON public.streaks;
DROP POLICY IF EXISTS "Users can create own streaks" ON public.streaks;

-- SELECT: Users can view their own streaks OR streaks for their student profiles
CREATE POLICY "Users can view own streaks" ON public.streaks
  FOR SELECT USING (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- INSERT: Users can create streaks for themselves OR for their student profiles
CREATE POLICY "Users can create own streaks" ON public.streaks
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- UPDATE: Users can update their own streaks OR streaks for their student profiles
CREATE POLICY "Users can update own streaks" ON public.streaks
  FOR UPDATE USING (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- ============================================
-- END OF MIGRATION
-- ============================================

