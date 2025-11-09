-- CLEAN DUPLICATE STREAK RECORDS FOR THIS USER
-- The user has 2 streak records, should only have 1

DELETE FROM streaks
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, student_profile_id)
    id
  FROM streaks
  WHERE user_id = '03103742-2b4d-4ee3-bad9-18a1e4d55998'
  ORDER BY user_id, student_profile_id, updated_at DESC
);

-- Verify (should show 1 record)
SELECT * FROM streaks WHERE user_id = '03103742-2b4d-4ee3-bad9-18a1e4d55998';

