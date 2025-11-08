-- Fix RLS policies for daily_problems_completion to allow service role access
-- The issue: Current policies block service role queries causing timeouts

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own daily problem completions" ON daily_problems_completion;
DROP POLICY IF EXISTS "Users can create their own daily problem completions" ON daily_problems_completion;
DROP POLICY IF EXISTS "Users can update their own daily problem completions" ON daily_problems_completion;

-- Create new policies that work correctly with service role
-- Note: Service role should bypass RLS, but we'll make policies that don't block it

-- Allow users to view their own completions (authenticated users only)
CREATE POLICY "Users can view their own daily problem completions"
  ON daily_problems_completion
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to view all completions (for API access)
CREATE POLICY "Service role can view all daily problem completions"
  ON daily_problems_completion
  FOR SELECT
  TO service_role
  USING (true);

-- Allow users to insert their own completions
CREATE POLICY "Users can create their own daily problem completions"
  ON daily_problems_completion
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert any completion (for API access)
CREATE POLICY "Service role can create any daily problem completion"
  ON daily_problems_completion
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow users to update their own completions
CREATE POLICY "Users can update their own daily problem completions"
  ON daily_problems_completion
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to update any completion (for API access)
CREATE POLICY "Service role can update any daily problem completion"
  ON daily_problems_completion
  FOR UPDATE
  TO service_role
  USING (true);

-- Add comment
COMMENT ON TABLE daily_problems_completion IS 'Tracks daily problem completion with RLS policies that support both user access and service role API access';

