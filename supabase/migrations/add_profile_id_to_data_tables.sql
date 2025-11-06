-- ============================================
-- Add student_profile_id to Data Tables
-- ============================================
-- This migration adds student_profile_id to all data tables
-- to support separate data per student profile
-- ============================================

-- ============================================
-- 1. XP DATA
-- ============================================
ALTER TABLE public.xp_data
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_xp_data_student_profile_id ON public.xp_data(student_profile_id);

-- Update unique constraint to allow multiple profiles per user
ALTER TABLE public.xp_data
DROP CONSTRAINT IF EXISTS xp_data_user_id_key;

-- New unique constraint: one XP record per user OR per student profile
-- We'll handle this with a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS xp_data_user_id_unique 
ON public.xp_data(user_id) 
WHERE student_profile_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS xp_data_profile_id_unique 
ON public.xp_data(student_profile_id) 
WHERE student_profile_id IS NOT NULL;

-- ============================================
-- 2. STREAKS
-- ============================================
ALTER TABLE public.streaks
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_streaks_student_profile_id ON public.streaks(student_profile_id);

-- Update unique constraint
ALTER TABLE public.streaks
DROP CONSTRAINT IF EXISTS streaks_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS streaks_user_id_unique 
ON public.streaks(user_id) 
WHERE student_profile_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS streaks_profile_id_unique 
ON public.streaks(student_profile_id) 
WHERE student_profile_id IS NOT NULL;

-- ============================================
-- 3. PROBLEMS
-- ============================================
ALTER TABLE public.problems
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_problems_student_profile_id ON public.problems(student_profile_id);

-- ============================================
-- 4. ACHIEVEMENTS
-- ============================================
ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_achievements_student_profile_id ON public.achievements(student_profile_id);

-- Update unique constraint to include profile_id
ALTER TABLE public.achievements
DROP CONSTRAINT IF EXISTS achievements_user_id_achievement_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS achievements_user_id_unique 
ON public.achievements(user_id, achievement_type) 
WHERE student_profile_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS achievements_profile_id_unique 
ON public.achievements(student_profile_id, achievement_type) 
WHERE student_profile_id IS NOT NULL;

-- ============================================
-- 5. STUDY SESSIONS
-- ============================================
ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_study_sessions_student_profile_id ON public.study_sessions(student_profile_id);

-- ============================================
-- 6. DAILY GOALS
-- ============================================
ALTER TABLE public.daily_goals
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_daily_goals_student_profile_id ON public.daily_goals(student_profile_id);

-- Update unique constraint
ALTER TABLE public.daily_goals
DROP CONSTRAINT IF EXISTS daily_goals_user_id_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_goals_user_id_unique 
ON public.daily_goals(user_id, date) 
WHERE student_profile_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_goals_profile_id_unique 
ON public.daily_goals(student_profile_id, date) 
WHERE student_profile_id IS NOT NULL;

-- ============================================
-- 7. UPDATE RLS POLICIES
-- ============================================
-- Update policies to allow access based on profile ownership

-- XP Data policies
DROP POLICY IF EXISTS "Users can view own XP" ON public.xp_data;
CREATE POLICY "Users can view own XP" ON public.xp_data
  FOR SELECT USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own XP" ON public.xp_data;
CREATE POLICY "Users can update own XP" ON public.xp_data
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- Streaks policies
DROP POLICY IF EXISTS "Users can view own streaks" ON public.streaks;
CREATE POLICY "Users can view own streaks" ON public.streaks
  FOR SELECT USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own streaks" ON public.streaks;
CREATE POLICY "Users can update own streaks" ON public.streaks
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- Problems policies
DROP POLICY IF EXISTS "Users can view own problems" ON public.problems;
CREATE POLICY "Users can view own problems" ON public.problems
  FOR SELECT USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own problems" ON public.problems;
CREATE POLICY "Users can create own problems" ON public.problems
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own problems" ON public.problems;
CREATE POLICY "Users can update own problems" ON public.problems
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- Achievements policies
DROP POLICY IF EXISTS "Users can view own achievements" ON public.achievements;
CREATE POLICY "Users can view own achievements" ON public.achievements
  FOR SELECT USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own achievements" ON public.achievements;
CREATE POLICY "Users can create own achievements" ON public.achievements
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- Study Sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.study_sessions;
CREATE POLICY "Users can view own sessions" ON public.study_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own sessions" ON public.study_sessions;
CREATE POLICY "Users can create own sessions" ON public.study_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- Daily Goals policies
DROP POLICY IF EXISTS "Users can manage own daily goals" ON public.daily_goals;
CREATE POLICY "Users can manage own daily goals" ON public.daily_goals
  FOR ALL USING (
    auth.uid() = user_id OR 
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- END OF MIGRATION
-- ============================================

