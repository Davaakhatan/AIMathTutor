-- Add nudges table for smart notifications
-- Add conversation_summaries table for AI memory system

-- Nudges table
CREATE TABLE IF NOT EXISTS nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  action_url TEXT,
  action_label TEXT,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for nudges
CREATE INDEX IF NOT EXISTS idx_nudges_user_id ON nudges(user_id);
CREATE INDEX IF NOT EXISTS idx_nudges_user_profile ON nudges(user_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_nudges_dismissed ON nudges(user_id, dismissed) WHERE NOT dismissed;

-- RLS for nudges
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nudges"
  ON nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own nudges"
  ON nudges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert nudges"
  ON nudges FOR INSERT
  WITH CHECK (true);

-- Conversation summaries table (for AI memory)
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  summary TEXT NOT NULL,
  concepts_covered TEXT[] DEFAULT '{}',
  difficulty_level TEXT,
  problem_types TEXT[] DEFAULT '{}',
  problems_solved INTEGER DEFAULT 0,
  hints_given INTEGER DEFAULT 0,
  session_duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for conversation_summaries
CREATE INDEX IF NOT EXISTS idx_convo_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_convo_summaries_user_profile ON conversation_summaries(user_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_convo_summaries_created ON conversation_summaries(user_id, created_at DESC);

-- RLS for conversation_summaries
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation summaries"
  ON conversation_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation summaries"
  ON conversation_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON nudges TO authenticated;
GRANT ALL ON nudges TO service_role;
GRANT ALL ON conversation_summaries TO authenticated;
GRANT ALL ON conversation_summaries TO service_role;
