-- Create conversation_summaries table for Study Companion
-- Stores AI-generated summaries of tutoring sessions for memory

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  session_id UUID, -- References sessions.id (optional, sessions might be deleted)
  summary TEXT NOT NULL,
  concepts_covered TEXT[] DEFAULT '{}', -- Array of mathematical concepts
  difficulty_level TEXT, -- 'elementary', 'middle', 'high', 'advanced'
  problem_types TEXT[] DEFAULT '{}', -- Array of problem types covered
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (hints used, time spent, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_profile_id ON conversation_summaries(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user_profile ON conversation_summaries(user_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON conversation_summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_session_id ON conversation_summaries(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own summaries
CREATE POLICY "Users can view their own summaries"
  ON conversation_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own summaries
CREATE POLICY "Users can create their own summaries"
  ON conversation_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own summaries
CREATE POLICY "Users can update their own summaries"
  ON conversation_summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own summaries
CREATE POLICY "Users can delete their own summaries"
  ON conversation_summaries FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp (if we add that column later)
-- For now, we just use created_at

-- Comments
COMMENT ON TABLE conversation_summaries IS 'Stores AI-generated summaries of tutoring sessions for persistent memory';
COMMENT ON COLUMN conversation_summaries.summary IS 'AI-generated summary of the conversation';
COMMENT ON COLUMN conversation_summaries.concepts_covered IS 'Array of mathematical concepts discussed in the session';
COMMENT ON COLUMN conversation_summaries.problem_types IS 'Array of problem types covered (algebra, geometry, etc.)';

