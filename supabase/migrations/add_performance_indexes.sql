-- Add performance indexes for critical queries
-- Run this in Supabase SQL Editor after server restart

-- Profiles table index
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Daily problems completion indexes
CREATE INDEX IF NOT EXISTS idx_daily_completion_user_date 
  ON daily_problems_completion(user_id, problem_date);

-- XP data index
CREATE INDEX IF NOT EXISTS idx_xp_data_user_id ON xp_data(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_data_user_profile 
  ON xp_data(user_id, student_profile_id);

-- Streaks index
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_user_profile 
  ON streaks(user_id, student_profile_id);

-- Problems indexes
CREATE INDEX IF NOT EXISTS idx_problems_user_id ON problems(user_id);
CREATE INDEX IF NOT EXISTS idx_problems_user_profile 
  ON problems(user_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_problems_bookmarked 
  ON problems(user_id, is_bookmarked) WHERE is_bookmarked = true;

-- Challenges indexes
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_share_code ON challenges(share_code);

-- Sessions index
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_profile 
  ON sessions(user_id, student_profile_id);

-- Daily goals indexes
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date 
  ON daily_goals(user_id, date);

-- Study sessions indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);

-- Learning goals index
CREATE INDEX IF NOT EXISTS idx_learning_goals_user_status 
  ON learning_goals(user_id, status);

-- Comments
COMMENT ON INDEX idx_profiles_id IS 'Performance: Fast profile lookups';
COMMENT ON INDEX idx_daily_completion_user_date IS 'Performance: Fast daily problem completion checks';
COMMENT ON INDEX idx_xp_data_user_id IS 'Performance: Fast XP data retrieval';
COMMENT ON INDEX idx_streaks_user_id IS 'Performance: Fast streak data retrieval';
COMMENT ON INDEX idx_problems_user_id IS 'Performance: Fast problem history retrieval';
COMMENT ON INDEX idx_challenges_user_id IS 'Performance: Fast challenge history retrieval';

