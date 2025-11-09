-- ============================================================================
-- COMPLETE DATABASE SCHEMA - All 3 Projects Unified
-- ============================================================================
-- Version: 2.0
-- Date: November 9, 2025
-- Purpose: Complete schema for AI Math Tutor + K-Factor + Study Companion
--
-- Run this in Supabase SQL Editor to create ALL tables needed
-- ============================================================================

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- CORE IDENTITY & PROFILES
-- ============================================================================

-- Base user profiles (one per auth.user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  role text DEFAULT 'student' CHECK (role IN ('student', 'parent', 'teacher', 'admin')),
  grade_level text CHECK (grade_level IN ('elementary', 'middle', 'high', 'advanced', 'college')),
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  settings jsonb DEFAULT '{}',
  current_student_profile_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Student profiles (multiple per parent/teacher)
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  grade_level text CHECK (grade_level IN ('elementary', 'middle', 'high', 'advanced', 'college')),
  difficulty_preference text DEFAULT 'middle' CHECK (difficulty_preference IN ('elementary', 'middle', 'high', 'advanced')),
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Link student profiles to parents/teachers
CREATE TABLE IF NOT EXISTS public.profile_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  can_view_progress boolean DEFAULT true,
  can_manage_profile boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_profile_id)
);

-- ============================================================================
-- PROJECT 1: CORE TUTORING DATA
-- ============================================================================

-- Problems (user-submitted or generated)
CREATE TABLE IF NOT EXISTS public.problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  type text,
  difficulty text,
  image_url text,
  parsed_data jsonb,
  is_bookmarked boolean DEFAULT false,
  is_generated boolean DEFAULT false,
  source text,
  solved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_problems_user ON problems(user_id);
CREATE INDEX idx_problems_profile ON problems(student_profile_id);
CREATE INDEX idx_problems_solved ON problems(solved_at) WHERE solved_at IS NOT NULL;

-- Chat sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES public.problems(id) ON DELETE SET NULL,
  difficulty_mode text DEFAULT 'middle',
  messages jsonb DEFAULT '[]',
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_profile ON sessions(student_profile_id);
CREATE INDEX idx_sessions_completed ON sessions(is_completed);

-- Daily problems
CREATE TABLE IF NOT EXISTS public.daily_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  problem_text text NOT NULL,
  problem_type text DEFAULT 'word_problem',
  difficulty text DEFAULT 'medium',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_daily_problems_date ON daily_problems(date DESC);

-- Daily problem completions
CREATE TABLE IF NOT EXISTS public.daily_problems_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  daily_problem_id uuid NOT NULL REFERENCES public.daily_problems(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_solved boolean DEFAULT false,
  completed_at timestamptz,
  time_spent_seconds integer,
  hints_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, daily_problem_id, student_profile_id)
);

CREATE INDEX idx_daily_completion_user_date ON daily_problems_completion(user_id, date DESC);

-- ============================================================================
-- PROJECT 2: GAMIFICATION & VIRAL GROWTH
-- ============================================================================

-- XP Data
CREATE TABLE IF NOT EXISTS public.xp_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  xp_to_next_level integer DEFAULT 100,
  xp_history jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_xp_user ON xp_data(user_id);
CREATE INDEX idx_xp_profile ON xp_data(student_profile_id);
CREATE INDEX idx_xp_level ON xp_data(level DESC);

-- Streaks
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

CREATE INDEX idx_streaks_user ON streaks(user_id);
CREATE INDEX idx_streaks_profile ON streaks(student_profile_id);

-- Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  achievement_name text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, student_profile_id, achievement_id)
);

CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_achievements_profile ON achievements(student_profile_id);

-- Leaderboard (materialized view or table for performance)
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  username text,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  rank integer,
  rank_name text,
  streak integer DEFAULT 0,
  problems_solved integer DEFAULT 0,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, student_profile_id)
);

CREATE INDEX idx_leaderboard_rank ON leaderboard(rank ASC);
CREATE INDEX idx_leaderboard_xp ON leaderboard(total_xp DESC);

-- Referral System
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  uses integer DEFAULT 0,
  max_uses integer,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  rewards_awarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referee_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON referrals(referee_id);

-- Challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenger_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  challenge_type text NOT NULL CHECK (challenge_type IN ('beat_my_time', 'same_problem', 'beat_my_skill')),
  problem_id uuid REFERENCES public.problems(id) ON DELETE CASCADE,
  problem_text text,
  problem_type text,
  difficulty text,
  creator_time_seconds integer,
  challenger_time_seconds integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired')),
  winner_id uuid REFERENCES public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_challenges_creator ON challenges(creator_id);
CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_status ON challenges(status);

-- Shares (social sharing tracking)
CREATE TABLE IF NOT EXISTS public.shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  share_type text NOT NULL CHECK (share_type IN ('problem', 'achievement', 'challenge', 'referral')),
  share_code text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{}',
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shares_user ON shares(user_id);
CREATE INDEX idx_shares_code ON shares(share_code);

-- ============================================================================
-- PROJECT 3: AI STUDY COMPANION
-- ============================================================================

-- Learning Goals
CREATE TABLE IF NOT EXISTS public.learning_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly', 'custom')),
  target_subject text,
  target_count integer,
  current_count integer DEFAULT 0,
  deadline date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_goals_user ON learning_goals(user_id);
CREATE INDEX idx_goals_status ON learning_goals(status);

-- Conversation Summaries (AI memory)
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  summary text NOT NULL,
  topics_covered text[],
  strengths text[],
  areas_to_improve text[],
  next_recommended_topics text[],
  sentiment text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_summaries_user ON conversation_summaries(user_id);
CREATE INDEX idx_summaries_created ON conversation_summaries(created_at DESC);

-- Study Sessions (time tracking)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id),
  subject text,
  duration_seconds integer,
  problems_solved integer DEFAULT 0,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_date ON study_sessions(start_time DESC);

-- Daily Goals (mini goals for each day)
CREATE TABLE IF NOT EXISTS public.daily_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  goal_type text NOT NULL,
  target_count integer NOT NULL,
  current_count integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, student_profile_id, date, goal_type)
);

CREATE INDEX idx_daily_goals_user_date ON daily_goals(user_id, date DESC);

-- Concept Mastery (track understanding per topic)
CREATE TABLE IF NOT EXISTS public.concept_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  concept_name text NOT NULL,
  category text,
  mastery_level integer DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
  times_practiced integer DEFAULT 0,
  last_practiced timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, student_profile_id, concept_name)
);

CREATE INDEX idx_concept_user ON concept_mastery(user_id);
CREATE INDEX idx_concept_mastery_level ON concept_mastery(mastery_level DESC);

-- Activity Events (for activity feed)
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_user ON activity_events(user_id);
CREATE INDEX idx_activity_created ON activity_events(created_at DESC);
CREATE INDEX idx_activity_type ON activity_events(event_type);

-- ============================================================================
-- ANALYTICS & TRACKING
-- ============================================================================

-- Analytics Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_properties jsonb DEFAULT '{}',
  session_id text,
  device_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_event ON analytics_events(event_name);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- ============================================================================
-- SOCIAL & COMMUNICATION
-- ============================================================================

-- Study Groups
CREATE TABLE IF NOT EXISTS public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id),
  is_public boolean DEFAULT false,
  invite_code text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Messages (for study groups or direct messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'problem', 'achievement')),
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_group ON messages(group_id);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text,
  action_url text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('study', 'goal', 'streak', 'custom')),
  title text NOT NULL,
  message text,
  remind_at timestamptz NOT NULL,
  is_sent boolean DEFAULT false,
  is_snoozed boolean DEFAULT false,
  snooze_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_time ON reminders(remind_at) WHERE NOT is_sent;

-- ============================================================================
-- CONTENT LIBRARY
-- ============================================================================

-- Study Materials
CREATE TABLE IF NOT EXISTS public.study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  material_type text CHECK (material_type IN ('video', 'article', 'practice', 'formula', 'tip')),
  subject text,
  difficulty text,
  tags text[],
  is_featured boolean DEFAULT false,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_materials_type ON study_materials(material_type);
CREATE INDEX idx_materials_subject ON study_materials(subject);
CREATE INDEX idx_materials_featured ON study_materials(is_featured) WHERE is_featured;

-- Practice Problems (generated/curated)
CREATE TABLE IF NOT EXISTS public.practice_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_text text NOT NULL,
  problem_type text NOT NULL,
  subject text,
  difficulty text,
  solution text,
  hints jsonb DEFAULT '[]',
  tags text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_practice_subject ON practice_problems(subject);
CREATE INDEX idx_practice_difficulty ON practice_problems(difficulty);
CREATE INDEX idx_practice_active ON practice_problems(is_active) WHERE is_active;

-- Tips & Formulas
CREATE TABLE IF NOT EXISTS public.tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text,
  subject text,
  tags text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  formula text NOT NULL,
  description text,
  subject text,
  category text,
  tags text[],
  created_at timestamptz DEFAULT now()
);

-- Badges (achievement metadata)
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_url text,
  rarity text CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_criteria jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.badges(badge_id),
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, student_profile_id, badge_id)
);

-- ============================================================================
-- FORUM & COMMUNITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  subject text,
  tags text[],
  upvotes integer DEFAULT 0,
  view_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  upvotes integer DEFAULT 0,
  is_solution boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SHOW ALL TABLES
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This creates the COMPLETE schema for all 3 projects:
--
-- PROJECT 1: Core Tutoring
-- - profiles, student_profiles, problems, sessions, daily_problems
--
-- PROJECT 2: Viral Growth & Gamification
-- - xp_data, streaks, achievements, leaderboard, referrals, challenges, shares
--
-- PROJECT 3: AI Study Companion
-- - learning_goals, conversation_summaries, study_sessions, concept_mastery
-- - daily_goals, activity_events
--
-- SUPPORTING:
-- - analytics_events, notifications, reminders
-- - study_materials, practice_problems, tips, formulas
-- - badges, study_groups, forum_posts, messages
--
-- TOTAL: ~30 tables covering all features
-- ============================================================================

