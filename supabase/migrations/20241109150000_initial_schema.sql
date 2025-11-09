-- Initial schema migration generated on 2024-11-09.
-- This recreates the full public schema required by the AI Tutor application.
-- Run with: npx supabase db push

BEGIN;

-- Extensions needed for UUID helpers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core identity tables -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  role text DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student','parent','teacher','admin'])),
  grade_level text CHECK (grade_level = ANY (ARRAY['elementary','middle','high','advanced','college'])),
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  settings jsonb DEFAULT '{}'::jsonb,
  current_student_profile_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id)
);

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  grade_level text CHECK (grade_level = ANY (ARRAY['elementary','middle','high','advanced','college'])),
  difficulty_preference text DEFAULT 'middle'::text CHECK (difficulty_preference = ANY (ARRAY['elementary','middle','high','advanced'])),
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_current_student_profile
  FOREIGN KEY (current_student_profile_id) REFERENCES public.student_profiles(id);

CREATE TABLE IF NOT EXISTS public.profile_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  can_view_progress boolean DEFAULT true,
  can_manage_profile boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sharing / collaboration -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid,
  is_public boolean DEFAULT false,
  invite_code text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner','admin','member'])),
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  share_type text NOT NULL,
  share_code text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shared_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid,
  shared_by uuid,
  shared_with uuid,
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Problem history & sessions --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  type text NOT NULL,
  difficulty text CHECK (difficulty = ANY (ARRAY['elementary','middle','high','advanced'])),
  image_url text,
  parsed_data jsonb,
  is_bookmarked boolean DEFAULT false,
  is_generated boolean DEFAULT false,
  source text,
  solved_at timestamptz,
  attempts integer DEFAULT 0,
  hints_used integer DEFAULT 0,
  time_spent integer DEFAULT 0,
  saved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES public.problems(id) ON DELETE SET NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb DEFAULT '{}'::jsonb,
  difficulty_mode text DEFAULT 'middle'::text CHECK (difficulty_mode = ANY (ARRAY['elementary','middle','high','advanced'])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active','completed','abandoned'])),
  started_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  summary text NOT NULL,
  concepts_covered text[] DEFAULT '{}',
  difficulty_level text,
  problem_types text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  problems_solved integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  duration integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.concept_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  concept_id text NOT NULL,
  mastery_score numeric DEFAULT 0.0 CHECK (mastery_score >= 0 AND mastery_score <= 1.0),
  problems_solved integer DEFAULT 0,
  last_practiced timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Daily / goal tracking -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.daily_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_date date NOT NULL UNIQUE,
  problem_text text NOT NULL,
  problem_type text NOT NULL,
  difficulty text NOT NULL,
  topic text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_problems_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  problem_date date NOT NULL,
  problem_text text NOT NULL,
  solved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  goal_type text NOT NULL,
  target_value integer,
  current_value integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  problems_goal integer DEFAULT 5 NOT NULL,
  time_goal integer DEFAULT 30 NOT NULL,
  problems_completed integer DEFAULT 0 NOT NULL,
  time_completed integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.learning_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  goal_type text NOT NULL,
  target_subject text NOT NULL,
  target_date date,
  status text DEFAULT 'active'::text,
  progress integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Gamification / XP -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.xp_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  xp_to_next_level integer DEFAULT 100,
  xp_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_study_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  problems_solved integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  last_active timestamptz DEFAULT now(),
  rank integer,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.difficulty_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  difficulty text NOT NULL CHECK (difficulty = ANY (ARRAY['elementary','middle','high','advanced'])),
  success_rate numeric DEFAULT 0.0,
  average_time integer DEFAULT 0,
  problems_attempted integer DEFAULT 0,
  problems_solved integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Challenges / referrals ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code varchar NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  total_signups integer DEFAULT 0,
  total_rewards_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code varchar NOT NULL UNIQUE,
  status varchar NOT NULL DEFAULT 'pending',
  reward_type varchar,
  reward_amount integer DEFAULT 0,
  referrer_reward_type varchar,
  referrer_reward_amount integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  rewarded_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  challenge_text text NOT NULL,
  challenge_type text,
  problem_type text,
  difficulty text,
  share_code text REFERENCES public.shares(share_code) ON DELETE SET NULL,
  share_id uuid REFERENCES public.shares(id) ON DELETE SET NULL,
  challenger_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  solved_at timestamptz,
  attempts integer DEFAULT 0,
  hints_used integer DEFAULT 0,
  time_spent integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications / events ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

COMMIT;


