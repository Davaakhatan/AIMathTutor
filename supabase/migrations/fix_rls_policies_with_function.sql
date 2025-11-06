-- ============================================
-- Fix RLS Policies Using Helper Function
-- ============================================
-- This migration creates a helper function and uses it in RLS policies
-- This is more reliable than subqueries in policies
-- ============================================

-- Create helper function to check if user owns a student profile
CREATE OR REPLACE FUNCTION public.user_owns_student_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.student_profiles
    WHERE id = profile_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    (student_profile_id IS NOT NULL AND public.user_owns_student_profile(student_profile_id))
  );

-- INSERT: Users can create XP for themselves OR for their student profiles
CREATE POLICY "Users can create own XP" ON public.xp_data
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND public.user_owns_student_profile(student_profile_id))
  );

-- UPDATE: Users can update their own XP OR XP for their student profiles
CREATE POLICY "Users can update own XP" ON public.xp_data
  FOR UPDATE USING (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND public.user_owns_student_profile(student_profile_id))
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
    (student_profile_id IS NOT NULL AND public.user_owns_student_profile(student_profile_id))
  );

-- INSERT: Users can create streaks for themselves OR for their student profiles
CREATE POLICY "Users can create own streaks" ON public.streaks
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND public.user_owns_student_profile(student_profile_id))
  );

-- UPDATE: Users can update their own streaks OR streaks for their student profiles
CREATE POLICY "Users can update own streaks" ON public.streaks
  FOR UPDATE USING (
    (user_id = auth.uid() AND student_profile_id IS NULL) OR 
    (student_profile_id IS NOT NULL AND public.user_owns_student_profile(student_profile_id))
  );

-- ============================================
-- END OF MIGRATION
-- ============================================

