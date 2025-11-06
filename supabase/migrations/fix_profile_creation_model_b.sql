-- ============================================
-- Fix Profile Creation for Model B
-- ============================================
-- This migration fixes RLS policies and ensures Model B works correctly
-- ============================================

-- Step 1: Fix circular dependency in profiles table
-- ============================================
-- The foreign key constraint on current_student_profile_id can cause issues
-- We'll make it DEFERRABLE so it can be set after the profile is created

-- Drop existing constraint if it exists
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS fk_profiles_current_student_profile;

-- Recreate with DEFERRABLE to allow setting it after profile creation
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_current_student_profile 
FOREIGN KEY (current_student_profile_id) 
REFERENCES public.student_profiles(id) 
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- Step 2: Ensure RLS policies allow profile creation for students
-- ============================================
-- Drop any conflicting policies
DROP POLICY IF EXISTS "Owners can create student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Parents can create student profiles" ON public.student_profiles;

-- Students can create their own profiles (for Model B)
CREATE POLICY "Students can create their own profiles" ON public.student_profiles
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Parents CANNOT create profiles in Model B (they link to existing ones)
-- No INSERT policy for parents - they must use profile_relationships

-- Step 3: Ensure the trigger creates default profile correctly
-- ============================================
-- Update the trigger function to handle the circular dependency
CREATE OR REPLACE FUNCTION create_default_student_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- If user role is 'student', create a default student profile
  IF NEW.role = 'student' THEN
    -- Insert the student profile
    INSERT INTO public.student_profiles (
      owner_id,
      name,
      grade_level,
      difficulty_preference
    ) VALUES (
      NEW.id,
      COALESCE(NEW.display_name, NEW.username, 'Student'),
      NEW.grade_level,
      'middle'
    )
    ON CONFLICT (owner_id, name) DO NOTHING
    RETURNING id INTO new_profile_id;
    
    -- Set as current profile (using DEFERRED constraint)
    IF new_profile_id IS NOT NULL THEN
      UPDATE public.profiles
      SET current_student_profile_id = new_profile_id
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Add missing UPDATE policy for profiles.current_student_profile_id
-- ============================================
-- Users should be able to update their own current_student_profile_id
-- This is needed when switching between profiles

-- Check if RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Step 5: Ensure parents can view but not create profiles
-- ============================================
-- Parents can view linked profiles (already exists)
-- But they should NOT be able to create new profiles

-- Verify parents cannot create profiles (no INSERT policy for parents)
-- This is correct for Model B - parents link to existing student profiles

-- ============================================
-- END OF MIGRATION
-- ============================================

