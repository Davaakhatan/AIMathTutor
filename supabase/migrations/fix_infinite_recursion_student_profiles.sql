-- ============================================
-- Fix Infinite Recursion in student_profiles RLS Policies
-- ============================================
-- The issue is that policies might be causing circular references
-- We'll use SECURITY DEFINER functions to break the recursion
-- ============================================

-- Step 1: Create helper functions to check permissions (breaks recursion)
-- ============================================

-- Function to check if user owns a student profile
CREATE OR REPLACE FUNCTION public.user_owns_student_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Direct check without RLS recursion
  RETURN EXISTS (
    SELECT 1 FROM public.student_profiles
    WHERE id = profile_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has relationship with a student profile
CREATE OR REPLACE FUNCTION public.user_has_relationship_with_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Direct check without RLS recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profile_relationships
    WHERE student_profile_id = profile_id
    AND parent_id = auth.uid()
    AND can_view_progress = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user can manage a student profile
CREATE OR REPLACE FUNCTION public.user_can_manage_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Direct check without RLS recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profile_relationships
    WHERE student_profile_id = profile_id
    AND parent_id = auth.uid()
    AND can_manage_profile = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop all existing student_profiles policies
-- ============================================
DROP POLICY IF EXISTS "Owners can view their student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Owners can create student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Owners can update their student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Owners can delete their student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view their own profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can create their own profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update their own profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can delete their own profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Parents can view linked student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Parents can update linked student profiles" ON public.student_profiles;

-- Step 3: Create new policies using helper functions (no recursion)
-- ============================================

-- SELECT: Students can view their own profiles OR parents can view linked profiles
CREATE POLICY "Users can view student profiles" ON public.student_profiles
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    public.user_has_relationship_with_profile(id)
  );

-- INSERT: Only students can create their own profiles
CREATE POLICY "Students can create their own profiles" ON public.student_profiles
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- UPDATE: Students can update their own profiles OR parents can update linked profiles
CREATE POLICY "Users can update student profiles" ON public.student_profiles
  FOR UPDATE USING (
    owner_id = auth.uid() OR 
    public.user_can_manage_profile(id)
  )
  WITH CHECK (
    owner_id = auth.uid() OR 
    public.user_can_manage_profile(id)
  );

-- DELETE: Only students can delete their own profiles
CREATE POLICY "Students can delete their own profiles" ON public.student_profiles
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================
-- END OF MIGRATION
-- ============================================

