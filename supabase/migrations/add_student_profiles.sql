-- ============================================
-- Multiple Student Profiles Support
-- ============================================
-- This migration adds support for parents/teachers to manage multiple student profiles
-- ============================================

-- Add current_student_profile_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_student_profile_id UUID;

-- ============================================
-- STUDENT PROFILES TABLE
-- ============================================
-- Stores individual student profiles that can be managed by parents/teachers
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  grade_level TEXT CHECK (grade_level IN ('elementary', 'middle', 'high', 'advanced', 'college')),
  difficulty_preference TEXT DEFAULT 'middle' CHECK (difficulty_preference IN ('elementary', 'middle', 'high', 'advanced')),
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  settings JSONB DEFAULT '{}'::jsonb, -- Student-specific settings
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, name) -- Prevent duplicate names for same owner
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_profiles_owner_id ON public.student_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_active ON public.student_profiles(owner_id, is_active) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Owners can view their student profiles
CREATE POLICY "Owners can view their student profiles" ON public.student_profiles
  FOR SELECT USING (owner_id = auth.uid());

-- Owners can create student profiles
CREATE POLICY "Owners can create student profiles" ON public.student_profiles
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Owners can update their student profiles
CREATE POLICY "Owners can update their student profiles" ON public.student_profiles
  FOR UPDATE USING (owner_id = auth.uid());

-- Owners can delete their student profiles
CREATE POLICY "Owners can delete their student profiles" ON public.student_profiles
  FOR DELETE USING (owner_id = auth.uid());

-- Add foreign key constraint for current_student_profile_id
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_current_student_profile
FOREIGN KEY (current_student_profile_id)
REFERENCES public.student_profiles(id)
ON DELETE SET NULL;

-- ============================================
-- PROFILE RELATIONSHIPS TABLE
-- ============================================
-- Links parents/teachers to students (for future collaboration features)
CREATE TABLE IF NOT EXISTS public.profile_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'teacher', 'guardian', 'tutor')),
  can_view_progress BOOLEAN DEFAULT TRUE,
  can_manage_profile BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_profile_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_relationships_parent ON public.profile_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_profile_relationships_student ON public.profile_relationships(student_profile_id);

-- RLS Policies
ALTER TABLE public.profile_relationships ENABLE ROW LEVEL SECURITY;

-- Parents can view relationships where they are the parent
CREATE POLICY "Parents can view their relationships" ON public.profile_relationships
  FOR SELECT USING (parent_id = auth.uid());

-- Parents can create relationships
CREATE POLICY "Parents can create relationships" ON public.profile_relationships
  FOR INSERT WITH CHECK (parent_id = auth.uid());

-- Parents can update their relationships
CREATE POLICY "Parents can update their relationships" ON public.profile_relationships
  FOR UPDATE USING (parent_id = auth.uid());

-- ============================================
-- UPDATE EXISTING TABLES TO SUPPORT STUDENT PROFILES
-- ============================================
-- Add student_profile_id to key tables (optional, for tracking per-profile data)
-- For now, we'll use the active profile ID from the profiles table
-- This allows gradual migration

-- Add updated_at trigger for student_profiles
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for profile_relationships
CREATE TRIGGER update_profile_relationships_updated_at BEFORE UPDATE ON public.profile_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get active student profile ID for a user
CREATE OR REPLACE FUNCTION get_active_student_profile_id(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  profile_role TEXT;
  active_profile_id UUID;
BEGIN
  -- Get user's role
  SELECT role INTO profile_role FROM public.profiles WHERE id = user_uuid;
  
  -- If user is a student, return their own profile ID (we'll create a student_profile for them)
  -- If user is parent/teacher, return their current_student_profile_id
  IF profile_role = 'student' THEN
    -- For students, we'll use their user_id as the profile_id
    -- In the future, we can create a student_profile for them
    RETURN user_uuid;
  ELSE
    -- For parents/teachers, return their selected student profile
    SELECT current_student_profile_id INTO active_profile_id 
    FROM public.profiles 
    WHERE id = user_uuid;
    
    -- If no profile selected, return NULL (will use user_id as fallback)
    RETURN active_profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default student profile for new student users
CREATE OR REPLACE FUNCTION create_default_student_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If user role is 'student', create a default student profile
  IF NEW.role = 'student' THEN
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
    ON CONFLICT (owner_id, name) DO NOTHING;
    
    -- Set as current profile
    UPDATE public.profiles
    SET current_student_profile_id = (
      SELECT id FROM public.student_profiles 
      WHERE owner_id = NEW.id 
      ORDER BY created_at DESC 
      LIMIT 1
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default student profile when student signs up
CREATE TRIGGER create_default_student_profile_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'student')
  EXECUTE FUNCTION create_default_student_profile();

