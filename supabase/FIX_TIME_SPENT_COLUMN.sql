-- Add time_spent column (code expects this name)
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS time_spent integer;

-- Copy data from time_spent_seconds if it exists
UPDATE problems
SET time_spent = time_spent_seconds
WHERE time_spent IS NULL AND time_spent_seconds IS NOT NULL;

SELECT 'time_spent column added to problems table' as status;

