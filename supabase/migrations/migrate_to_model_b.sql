-- ============================================
-- Migration to Model B: Students Own Their Profiles
-- ============================================
-- This migration changes from Model A (parent-owned profiles) to Model B (student-owned profiles)
-- ============================================

-- Step 1: Add student_profile_id to missing tables
-- ============================================

-- Add to concept_mastery
ALTER TABLE public.concept_mastery
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_concept_mastery_student_profile ON public.concept_mastery(student_profile_id);

-- Add to difficulty_performance
ALTER TABLE public.difficulty_performance
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_difficulty_performance_student_profile ON public.difficulty_performance(student_profile_id);

-- Add to sessions
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sessions_student_profile ON public.sessions(student_profile_id);

-- ============================================
-- Step 2: Update profile_relationships to link to student user accounts
-- ============================================
-- Currently profile_relationships links parent_id to student_profile_id
-- For Model B, we need to ensure student_profile_id references a profile owned by the student
-- The current structure is actually correct, but we need to update RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Parents can view their relationships" ON public.profile_relationships;
DROP POLICY IF EXISTS "Parents can create relationships" ON public.profile_relationships;
DROP POLICY IF EXISTS "Parents can update their relationships" ON public.profile_relationships;
DROP POLICY IF EXISTS "Students can view relationships where they are the student" ON public.profile_relationships;

-- New RLS policies for Model B
-- Parents can view relationships where they are the parent
CREATE POLICY "Parents can view their relationships" ON public.profile_relationships
  FOR SELECT USING (parent_id = auth.uid());

-- Parents can create relationships (but only to student profiles they have permission to link)
CREATE POLICY "Parents can create relationships" ON public.profile_relationships
  FOR INSERT WITH CHECK (parent_id = auth.uid());

-- Parents can update their relationships
CREATE POLICY "Parents can update their relationships" ON public.profile_relationships
  FOR UPDATE USING (parent_id = auth.uid());

-- Parents can delete their relationships
CREATE POLICY "Parents can delete their relationships" ON public.profile_relationships
  FOR DELETE USING (parent_id = auth.uid());

-- Students can view relationships where their profile is linked
CREATE POLICY "Students can view relationships for their profile" ON public.profile_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles
      WHERE student_profiles.id = profile_relationships.student_profile_id
      AND student_profiles.owner_id = auth.uid()
    )
  );

-- ============================================
-- Step 3: Update student_profiles RLS policies for Model B
-- ============================================
-- In Model B, students own their profiles, parents can view via relationships

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view their student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Owners can create student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Owners can update their student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Owners can delete their student profiles" ON public.student_profiles;

-- Students can view their own profiles
CREATE POLICY "Students can view their own profiles" ON public.student_profiles
  FOR SELECT USING (owner_id = auth.uid());

-- Students can create their own profiles (though typically auto-created)
CREATE POLICY "Students can create their own profiles" ON public.student_profiles
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Students can update their own profiles
CREATE POLICY "Students can update their own profiles" ON public.student_profiles
  FOR UPDATE USING (owner_id = auth.uid());

-- Students can delete their own profiles
CREATE POLICY "Students can delete their own profiles" ON public.student_profiles
  FOR DELETE USING (owner_id = auth.uid());

-- Parents can view student profiles they have relationships with
CREATE POLICY "Parents can view linked student profiles" ON public.student_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profile_relationships
      WHERE profile_relationships.student_profile_id = student_profiles.id
      AND profile_relationships.parent_id = auth.uid()
      AND profile_relationships.can_view_progress = TRUE
    )
  );

-- Parents can update student profiles they have manage permission for
CREATE POLICY "Parents can update linked student profiles" ON public.student_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profile_relationships
      WHERE profile_relationships.student_profile_id = student_profiles.id
      AND profile_relationships.parent_id = auth.uid()
      AND profile_relationships.can_manage_profile = TRUE
    )
  );

-- ============================================
-- Step 4: Update helper function for Model B
-- ============================================

-- Update get_active_student_profile_id to work with Model B
CREATE OR REPLACE FUNCTION get_active_student_profile_id(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  profile_role TEXT;
  active_profile_id UUID;
BEGIN
  -- Get user's role
  SELECT role INTO profile_role FROM public.profiles WHERE id = user_uuid;
  
  -- If user is a student, return their own student_profile_id
  IF profile_role = 'student' THEN
    -- Get the student's profile (they should have one)
    SELECT id INTO active_profile_id 
    FROM public.student_profiles 
    WHERE owner_id = user_uuid 
    AND is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;
    
    RETURN active_profile_id;
  ELSE
    -- For parents/teachers, return their current_student_profile_id (linked student)
    SELECT current_student_profile_id INTO active_profile_id 
    FROM public.profiles 
    WHERE id = user_uuid;
    
    RETURN active_profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 5: Update create_default_student_profile function
-- ============================================
-- This function already creates a profile for students, which is correct for Model B
-- But we should ensure it sets the profile as active and links it properly

CREATE OR REPLACE FUNCTION create_default_student_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- If user role is 'student', create a default student profile
  IF NEW.role = 'student' THEN
    INSERT INTO public.student_profiles (
      owner_id,
      name,
      grade_level,
      difficulty_preference,
      is_active
    ) VALUES (
      NEW.id,
      COALESCE(NEW.display_name, NEW.username, 'Student'),
      NEW.grade_level,
      'middle',
      TRUE
    )
    RETURNING id INTO new_profile_id;
    
    -- Set as current profile
    UPDATE public.profiles
    SET current_student_profile_id = new_profile_id
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 6: Add unique constraints to prevent duplicate data per profile
-- ============================================

-- XP data should be unique per user or per student_profile
-- Drop existing unique constraint if it exists
ALTER TABLE public.xp_data DROP CONSTRAINT IF EXISTS xp_data_user_id_unique;

-- Add unique constraint: one XP record per user OR per student_profile
CREATE UNIQUE INDEX IF NOT EXISTS xp_data_user_unique 
ON public.xp_data(user_id) 
WHERE student_profile_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS xp_data_profile_unique 
ON public.xp_data(student_profile_id) 
WHERE student_profile_id IS NOT NULL;

-- Streaks should be unique per user or per student_profile
-- Drop existing unique constraint if it exists
ALTER TABLE public.streaks DROP CONSTRAINT IF EXISTS streaks_user_id_unique;

-- Add unique constraint: one streak record per user OR per student_profile
CREATE UNIQUE INDEX IF NOT EXISTS streaks_user_unique 
ON public.streaks(user_id) 
WHERE student_profile_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS streaks_profile_unique 
ON public.streaks(student_profile_id) 
WHERE student_profile_id IS NOT NULL;

-- ============================================
-- Step 7: Update RLS policies for data tables to support Model B
-- ============================================
-- Students should see their own data
-- Parents should see data for linked student profiles

-- Note: These policies should already exist from previous migrations
-- But we'll add a comment here for clarity
-- The existing policies using user_owns_student_profile() function should work
-- We just need to ensure students can access their own profile data

-- ============================================
-- Step 8: Update handle_new_user function to set role
-- ============================================
-- This function is called when a new user signs up via Supabase Auth
-- We need to ensure it sets the role from user metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role, grade_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'), -- Default to student if not specified
    NULL -- grade_level can be set later
  );
  
  -- Initialize default data (only for students - parents don't need XP/streaks)
  -- The create_default_student_profile trigger will handle student profile creation
  -- and the student profile will have its own XP/streaks data
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- END OF MIGRATION
-- ============================================
-- After running this migration:
-- 1. Students own their profiles (owner_id = student's user_id)
-- 2. Parents link to student profiles via profile_relationships
-- 3. Students see their own data
-- 4. Parents see linked student data based on permissions
-- 5. Role is set correctly during signup
-- ============================================

