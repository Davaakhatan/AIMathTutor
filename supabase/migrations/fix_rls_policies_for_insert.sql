-- ============================================
-- Fix RLS Policies for INSERT Operations
-- ============================================
-- This migration adds missing INSERT policies for xp_data and streaks
-- ============================================

-- XP Data INSERT policy
DROP POLICY IF EXISTS "Users can create own XP" ON public.xp_data;
CREATE POLICY "Users can create own XP" ON public.xp_data
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- Streaks INSERT policy
DROP POLICY IF EXISTS "Users can create own streaks" ON public.streaks;
CREATE POLICY "Users can create own streaks" ON public.streaks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- END OF MIGRATION
-- ============================================

