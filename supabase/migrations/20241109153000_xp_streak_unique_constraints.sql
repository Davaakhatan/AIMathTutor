BEGIN;

-- Clean up duplicate XP rows, keeping the most recent entry per (user, profile)
WITH ranked_xp AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, student_profile_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM xp_data
)
DELETE FROM xp_data
WHERE id IN (SELECT id FROM ranked_xp WHERE rn > 1);

-- Ensure uniqueness for user-level XP (no student_profile_id)
DROP INDEX IF EXISTS idx_xp_data_user_unique;
CREATE UNIQUE INDEX idx_xp_data_user_unique
  ON xp_data(user_id)
  WHERE student_profile_id IS NULL;

-- Ensure uniqueness for profile-level XP (has student_profile_id)
DROP INDEX IF EXISTS idx_xp_data_profile_unique;
CREATE UNIQUE INDEX idx_xp_data_profile_unique
  ON xp_data(student_profile_id)
  WHERE student_profile_id IS NOT NULL;

-- Clean up duplicate streak rows
WITH ranked_streaks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, student_profile_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM streaks
)
DELETE FROM streaks
WHERE id IN (SELECT id FROM ranked_streaks WHERE rn > 1);

-- Ensure uniqueness for user-level streaks
DROP INDEX IF EXISTS idx_streaks_user_unique;
CREATE UNIQUE INDEX idx_streaks_user_unique
  ON streaks(user_id)
  WHERE student_profile_id IS NULL;

-- Ensure uniqueness for profile-level streaks
DROP INDEX IF EXISTS idx_streaks_profile_unique;
CREATE UNIQUE INDEX idx_streaks_profile_unique
  ON streaks(student_profile_id)
  WHERE student_profile_id IS NOT NULL;

COMMIT;

