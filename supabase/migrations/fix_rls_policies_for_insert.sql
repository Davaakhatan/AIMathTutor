-- ============================================
-- Fix RLS Policies for INSERT Operations
-- ============================================
-- This migration adds missing INSERT policies for xp_data and streaks
-- Also fixes SELECT policies to handle profile queries correctly
-- ============================================

-- XP Data INSERT policy
DROP POLICY IF EXISTS "Users can create own XP" ON public.xp_data;
CREATE POLICY "Users can create own XP" ON public.xp_data
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- Fix XP Data SELECT policy to handle NULL profile_id queries
DROP POLICY IF EXISTS "Users can view own XP" ON public.xp_data;
CREATE POLICY "Users can view own XP" ON public.xp_data
  FOR SELECT USING (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- Streaks INSERT policy
DROP POLICY IF EXISTS "Users can create own streaks" ON public.streaks;
CREATE POLICY "Users can create own streaks" ON public.streaks
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- Fix Streaks SELECT policy to handle NULL profile_id queries
DROP POLICY IF EXISTS "Users can view own streaks" ON public.streaks;
CREATE POLICY "Users can view own streaks" ON public.streaks
  FOR SELECT USING (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    ))
  );

-- ============================================
-- END OF MIGRATION
-- ============================================

