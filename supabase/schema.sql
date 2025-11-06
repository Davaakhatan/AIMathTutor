-- ============================================
-- AI Math Tutor - Supabase Database Schema
-- ============================================
-- This schema supports all features: auth, sessions, progress, collaboration, analytics
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: JWT secret is configured in Supabase Dashboard → Settings → API
-- Row Level Security is enabled per-table below

-- ============================================
-- 1. USER PROFILES (extends Supabase Auth)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'parent', 'teacher', 'admin')),
  grade_level TEXT CHECK (grade_level IN ('elementary', 'middle', 'high', 'advanced', 'college')),
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  settings JSONB DEFAULT '{}'::jsonb, -- UI preferences, sound, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 2. SESSIONS (replaces in-memory storage)
-- ============================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id UUID, -- Will add foreign key constraint after problems table is created
  messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of Message objects
  context JSONB DEFAULT '{}'::jsonb, -- Problem context, stuckCount, etc.
  difficulty_mode TEXT DEFAULT 'middle' CHECK (difficulty_mode IN ('elementary', 'middle', 'high', 'advanced')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);

-- RLS Policies
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-cleanup expired sessions (run via cron or function)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. PROBLEMS (history, bookmarks, generated)
-- ============================================
CREATE TABLE public.problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL, -- ProblemType enum
  difficulty TEXT CHECK (difficulty IN ('elementary', 'middle', 'high', 'advanced')),
  image_url TEXT, -- If uploaded from image
  parsed_data JSONB, -- Full ParsedProblem object
  is_bookmarked BOOLEAN DEFAULT FALSE,
  is_generated BOOLEAN DEFAULT FALSE, -- AI-generated vs user-uploaded
  source TEXT, -- 'upload', 'generated', 'daily', 'suggestion'
  solved_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_problems_user_id ON public.problems(user_id);
CREATE INDEX idx_problems_type ON public.problems(type);
CREATE INDEX idx_problems_bookmarked ON public.problems(is_bookmarked) WHERE is_bookmarked = TRUE;
CREATE INDEX idx_problems_created_at ON public.problems(created_at DESC);

ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own problems" ON public.problems
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own problems" ON public.problems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own problems" ON public.problems
  FOR UPDATE USING (auth.uid() = user_id);

-- Add foreign key constraint to sessions.problem_id now that problems table exists
ALTER TABLE public.sessions
  ADD CONSTRAINT fk_sessions_problem_id 
  FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE SET NULL;

-- ============================================
-- 4. XP & LEVELING SYSTEM
-- ============================================
CREATE TABLE public.xp_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp_to_next_level INTEGER DEFAULT 100,
  xp_history JSONB DEFAULT '[]'::jsonb, -- Array of {date, xp, reason}
  recent_gains JSONB DEFAULT '[]'::jsonb, -- Array of {timestamp, xp, reason}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_data_user_id ON public.xp_data(user_id);
CREATE INDEX idx_xp_data_level ON public.xp_data(level DESC);

ALTER TABLE public.xp_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP" ON public.xp_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own XP" ON public.xp_data
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 5. ACHIEVEMENTS
-- ============================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL, -- 'first_problem', 'level_5', 'streak_7', etc.
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

CREATE INDEX idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX idx_achievements_type ON public.achievements(achievement_type);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own achievements" ON public.achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. STUDY STREAKS
-- ============================================
CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_streaks_user_id ON public.streaks(user_id);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON public.streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON public.streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 7. STUDY SESSIONS (timer tracking)
-- ============================================
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0, -- in seconds
  problems_solved INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_start_time ON public.study_sessions(start_time DESC);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. DAILY GOALS
-- ============================================
CREATE TABLE public.daily_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  problems_goal INTEGER DEFAULT 5,
  time_goal INTEGER DEFAULT 30, -- in minutes
  problems_completed INTEGER DEFAULT 0,
  time_completed INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_goals_user_date ON public.daily_goals(user_id, date DESC);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals" ON public.daily_goals
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 9. CONCEPT MASTERY TRACKING
-- ============================================
CREATE TABLE public.concept_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL, -- 'linear_equations', 'pythagorean_theorem', etc.
  concept_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'algebra', 'geometry', 'arithmetic'
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  problems_attempted INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  average_hints NUMERIC(5,2) DEFAULT 0,
  average_time NUMERIC(10,2) DEFAULT 0, -- in minutes
  last_practiced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, concept_id)
);

CREATE INDEX idx_concept_mastery_user_id ON public.concept_mastery(user_id);
CREATE INDEX idx_concept_mastery_category ON public.concept_mastery(category);
CREATE INDEX idx_concept_mastery_mastery_level ON public.concept_mastery(mastery_level);

ALTER TABLE public.concept_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own concepts" ON public.concept_mastery
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 10. DIFFICULTY TRACKING
-- ============================================
CREATE TABLE public.difficulty_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('elementary', 'middle', 'high', 'advanced')),
  problems_attempted INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  average_attempts NUMERIC(5,2) DEFAULT 0,
  average_time NUMERIC(10,2) DEFAULT 0, -- in minutes
  average_hints NUMERIC(5,2) DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0, -- 0-100
  mastery_score NUMERIC(5,2) DEFAULT 50, -- 0-100
  last_attempted TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, difficulty)
);

CREATE INDEX idx_difficulty_performance_user_id ON public.difficulty_performance(user_id);

ALTER TABLE public.difficulty_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own difficulty" ON public.difficulty_performance
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 11. LEADERBOARD (global rankings)
-- ============================================
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  problems_solved INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  rank INTEGER, -- Calculated via view or function
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_xp ON public.leaderboard(total_xp DESC);
CREATE INDEX idx_leaderboard_level ON public.leaderboard(level DESC);
CREATE INDEX idx_leaderboard_streak ON public.leaderboard(current_streak DESC);

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Everyone can view leaderboard (read-only)
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard
  FOR SELECT USING (true);

-- Only users can update their own entry
CREATE POLICY "Users can update own leaderboard" ON public.leaderboard
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 12. COLLABORATION (study groups, sharing)
-- ============================================
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  invite_code TEXT UNIQUE, -- For joining
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.study_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.shared_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = public
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE, -- NULL = direct share
  message TEXT, -- Optional message with share
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_problems_shared_with ON public.shared_problems(shared_with);
CREATE INDEX idx_shared_problems_group_id ON public.shared_problems(group_id);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_problems ENABLE ROW LEVEL SECURITY;

-- Study groups policies
CREATE POLICY "Users can view public groups or own groups" ON public.study_groups
  FOR SELECT USING (is_public = TRUE OR created_by = auth.uid());

CREATE POLICY "Users can create groups" ON public.study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Members policies
CREATE POLICY "Users can view groups they're in" ON public.study_group_members
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.study_groups WHERE id = study_group_members.group_id AND created_by = auth.uid()
  ));

-- Shared problems policies
CREATE POLICY "Users can view shared problems" ON public.shared_problems
  FOR SELECT USING (
    shared_with = auth.uid() OR 
    shared_with IS NULL OR 
    shared_by = auth.uid()
  );

-- ============================================
-- 13. REAL-TIME COLLABORATION (whiteboard sessions)
-- ============================================
CREATE TABLE public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type TEXT DEFAULT 'whiteboard' CHECK (session_type IN ('whiteboard', 'tutoring', 'review')),
  is_active BOOLEAN DEFAULT TRUE,
  whiteboard_data JSONB, -- Canvas state
  participants JSONB DEFAULT '[]'::jsonb, -- Array of user IDs
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_collaboration_sessions_active ON public.collaboration_sessions(is_active) WHERE is_active = TRUE;

ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active sessions they're in" ON public.collaboration_sessions
  FOR SELECT USING (
    created_by = auth.uid() OR 
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
  );

-- ============================================
-- 14. ANALYTICS & REPORTING
-- ============================================
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'problem_solved', 'hint_used', 'session_started', etc.
  event_data JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_timestamp ON public.analytics_events(timestamp DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analytics" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 15. NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'reminder', 'achievement', 'goal', 'social'
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 16. TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON public.problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_xp_data_updated_at BEFORE UPDATE ON public.xp_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streaks_updated_at BEFORE UPDATE ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_goals_updated_at BEFORE UPDATE ON public.daily_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concept_mastery_updated_at BEFORE UPDATE ON public.concept_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_difficulty_performance_updated_at BEFORE UPDATE ON public.difficulty_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON public.leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  -- Initialize default data
  INSERT INTO public.xp_data (user_id) VALUES (NEW.id);
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  INSERT INTO public.leaderboard (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update leaderboard when XP changes
CREATE OR REPLACE FUNCTION update_leaderboard_from_xp()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.leaderboard (user_id, total_xp, level, last_active)
  VALUES (NEW.user_id, NEW.total_xp, NEW.level, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = NEW.total_xp,
    level = NEW.level,
    last_active = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_xp_update
  AFTER UPDATE OF total_xp, level ON public.xp_data
  FOR EACH ROW EXECUTE FUNCTION update_leaderboard_from_xp();

-- ============================================
-- 17. VIEWS FOR COMMON QUERIES
-- ============================================

-- User progress summary view
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT 
  p.id as user_id,
  p.username,
  p.display_name,
  COALESCE(x.total_xp, 0) as total_xp,
  COALESCE(x.level, 1) as level,
  COALESCE(s.current_streak, 0) as current_streak,
  COALESCE(lb.problems_solved, 0) as problems_solved,
  COUNT(DISTINCT pr.id) as total_problems,
  COUNT(DISTINCT CASE WHEN pr.solved_at IS NOT NULL THEN pr.id END) as solved_problems
FROM public.profiles p
LEFT JOIN public.xp_data x ON p.id = x.user_id
LEFT JOIN public.streaks s ON p.id = s.user_id
LEFT JOIN public.leaderboard lb ON p.id = lb.user_id
LEFT JOIN public.problems pr ON p.id = pr.user_id
GROUP BY p.id, p.username, p.display_name, x.total_xp, x.level, s.current_streak, lb.problems_solved;

-- ============================================
-- END OF SCHEMA
-- ============================================

