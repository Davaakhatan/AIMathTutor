-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  achievement_type text NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT achievements_pkey PRIMARY KEY (id),
  CONSTRAINT achievements_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id),
  CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  challenge_text text NOT NULL,
  challenge_type text,
  problem_type text,
  difficulty text,
  share_code text,
  share_id uuid,
  challenger_id uuid,
  solved_at timestamp with time zone,
  attempts integer DEFAULT 0,
  hints_used integer DEFAULT 0,
  time_spent integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT challenges_pkey PRIMARY KEY (id),
  CONSTRAINT challenges_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id),
  CONSTRAINT challenges_share_code_fkey FOREIGN KEY (share_code) REFERENCES public.shares(share_code),
  CONSTRAINT challenges_share_id_fkey FOREIGN KEY (share_id) REFERENCES public.shares(id),
  CONSTRAINT challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT challenges_challenger_id_fkey FOREIGN KEY (challenger_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.collaboration_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  problem_id uuid,
  created_by uuid,
  session_type text DEFAULT 'whiteboard'::text CHECK (session_type = ANY (ARRAY['whiteboard'::text, 'tutoring'::text, 'review'::text])),
  is_active boolean DEFAULT true,
  whiteboard_data jsonb,
  participants jsonb DEFAULT '[]'::jsonb,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  CONSTRAINT collaboration_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.concept_mastery (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  concept_id text NOT NULL,
  mastery_score numeric DEFAULT 0.0 CHECK (mastery_score >= 0::numeric AND mastery_score <= 1.0),
  problems_solved integer DEFAULT 0,
  last_practiced timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT concept_mastery_pkey PRIMARY KEY (id),
  CONSTRAINT concept_mastery_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT concept_mastery_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id)
);
CREATE TABLE public.conversation_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  session_id uuid,
  summary text NOT NULL,
  concepts_covered ARRAY DEFAULT '{}'::text[],
  difficulty_level text,
  problem_types ARRAY DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversation_summaries_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_summaries_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id),
  CONSTRAINT conversation_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.daily_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  date date NOT NULL,
  goal_type text NOT NULL,
  target_value integer,
  current_value integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  problems_goal integer NOT NULL DEFAULT 5,
  time_goal integer NOT NULL DEFAULT 30,
  problems_completed integer NOT NULL DEFAULT 0,
  time_completed integer NOT NULL DEFAULT 0,
  CONSTRAINT daily_goals_pkey PRIMARY KEY (id),
  CONSTRAINT daily_goals_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id),
  CONSTRAINT daily_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.daily_problems (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  problem_date date NOT NULL UNIQUE,
  problem_text text NOT NULL,
  problem_type text NOT NULL,
  difficulty text NOT NULL,
  topic text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_problems_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_problems_completion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  problem_date date NOT NULL,
  problem_text text NOT NULL,
  solved_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_problems_completion_pkey PRIMARY KEY (id),
  CONSTRAINT daily_problems_completion_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT daily_problems_completion_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id)
);
CREATE TABLE public.difficulty_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  difficulty text NOT NULL CHECK (difficulty = ANY (ARRAY['elementary'::text, 'middle'::text, 'high'::text, 'advanced'::text])),
  success_rate numeric DEFAULT 0.0,
  average_time integer DEFAULT 0,
  problems_attempted integer DEFAULT 0,
  problems_solved integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT difficulty_performance_pkey PRIMARY KEY (id),
  CONSTRAINT difficulty_performance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT difficulty_performance_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id)
);
CREATE TABLE public.leaderboard (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  problems_solved integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  last_active timestamp with time zone DEFAULT now(),
  rank integer,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leaderboard_pkey PRIMARY KEY (id)
);
CREATE TABLE public.learning_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  goal_type text NOT NULL,
  target_subject text NOT NULL,
  target_date date,
  status text NOT NULL DEFAULT 'active'::text,
  progress integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT learning_goals_pkey PRIMARY KEY (id),
  CONSTRAINT learning_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT learning_goals_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.problems (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  text text NOT NULL,
  type text NOT NULL,
  difficulty text CHECK (difficulty = ANY (ARRAY['elementary'::text, 'middle'::text, 'high'::text, 'advanced'::text])),
  image_url text,
  parsed_data jsonb,
  is_bookmarked boolean DEFAULT false,
  is_generated boolean DEFAULT false,
  source text,
  solved_at timestamp with time zone,
  attempts integer DEFAULT 0,
  hints_used integer DEFAULT 0,
  time_spent integer DEFAULT 0,
  saved_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT problems_pkey PRIMARY KEY (id),
  CONSTRAINT problems_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT problems_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id)
);
CREATE TABLE public.profile_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  can_view_progress boolean DEFAULT true,
  can_manage_profile boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT profile_relationships_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id),
  CONSTRAINT profile_relationships_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  role text DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'parent'::text, 'teacher'::text, 'admin'::text])),
  grade_level text CHECK (grade_level = ANY (ARRAY['elementary'::text, 'middle'::text, 'high'::text, 'advanced'::text, 'college'::text])),
  timezone text DEFAULT 'UTC'::text,
  language text DEFAULT 'en'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  current_student_profile_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT fk_profiles_current_student_profile FOREIGN KEY (current_student_profile_id) REFERENCES public.student_profiles(id)
);
CREATE TABLE public.referral_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code character varying NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  total_signups integer DEFAULT 0,
  total_rewards_earned integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referee_id uuid NOT NULL UNIQUE,
  referral_code character varying NOT NULL UNIQUE,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  reward_type character varying,
  reward_amount integer DEFAULT 0,
  referrer_reward_type character varying,
  referrer_reward_amount integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  rewarded_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id),
  CONSTRAINT referrals_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  problem_id uuid,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb DEFAULT '{}'::jsonb,
  difficulty_mode text DEFAULT 'middle'::text CHECK (difficulty_mode = ANY (ARRAY['elementary'::text, 'middle'::text, 'high'::text, 'advanced'::text])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text])),
  started_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '00:30:00'::interval),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT sessions_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id)
);
CREATE TABLE public.shared_problems (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  problem_id uuid,
  shared_by uuid,
  shared_with uuid,
  group_id uuid,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shared_problems_pkey PRIMARY KEY (id),
  CONSTRAINT shared_problems_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id)
);
CREATE TABLE public.shares (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  student_profile_id uuid,
  share_type text NOT NULL,
  share_code text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  expires_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT shares_pkey PRIMARY KEY (id),
  CONSTRAINT shares_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id),
  CONSTRAINT shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_study_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT streaks_pkey PRIMARY KEY (id),
  CONSTRAINT streaks_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id),
  CONSTRAINT streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.student_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  avatar_url text,
  grade_level text CHECK (grade_level = ANY (ARRAY['elementary'::text, 'middle'::text, 'high'::text, 'advanced'::text, 'college'::text])),
  difficulty_preference text DEFAULT 'middle'::text CHECK (difficulty_preference = ANY (ARRAY['elementary'::text, 'middle'::text, 'high'::text, 'advanced'::text])),
  timezone text DEFAULT 'UTC'::text,
  language text DEFAULT 'en'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT student_profiles_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.study_group_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid,
  user_id uuid,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT study_group_members_pkey PRIMARY KEY (id),
  CONSTRAINT study_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id)
);
CREATE TABLE public.study_groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_by uuid,
  is_public boolean DEFAULT false,
  invite_code text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT study_groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.study_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  problems_solved integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  end_time timestamp with time zone,
  duration integer NOT NULL DEFAULT 0,
  CONSTRAINT study_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT study_sessions_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id),
  CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.xp_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_profile_id uuid,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  xp_to_next_level integer DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  xp_history jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT xp_data_pkey PRIMARY KEY (id),
  CONSTRAINT xp_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT xp_data_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id)
);