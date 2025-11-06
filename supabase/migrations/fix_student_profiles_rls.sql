-- ============================================
-- Fix Student Profiles RLS Policies
-- ============================================
-- This migration fixes UPDATE policy for student_profiles
-- to ensure it works correctly with Supabase queries
-- ============================================

-- Drop and recreate UPDATE policy with explicit WITH CHECK clause
DROP POLICY IF EXISTS "Owners can update their student profiles" ON public.student_profiles;
CREATE POLICY "Owners can update their student profiles" ON public.student_profiles
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================
-- END OF MIGRATION
-- ============================================

