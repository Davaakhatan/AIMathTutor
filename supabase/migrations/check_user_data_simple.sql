-- Simple query to check what data exists for this user
-- User ID: 1ca456bd-f506-48d9-9834-4a3227e0038f

-- 1. Check profile
SELECT 'PROFILE' as data_type, id, username, role, created_at 
FROM profiles 
WHERE id = '1ca456bd-f506-48d9-9834-4a3227e0038f';

-- 2. Check XP data (ALL records for this user)
SELECT 'XP_DATA' as data_type, user_id, student_profile_id, total_xp, level, xp_to_next_level, created_at, updated_at
FROM xp_data 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f';

-- 3. Check streaks (ALL records for this user)
SELECT 'STREAKS' as data_type, user_id, student_profile_id, current_streak, longest_streak, last_study_date, created_at, updated_at
FROM streaks 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f';

-- 4. Count total problems
SELECT 'TOTAL_PROBLEMS' as data_type, COUNT(*) as count
FROM problems 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f';

-- 5. Check student profiles
SELECT 'STUDENT_PROFILES' as data_type, id, name, grade_level, created_at
FROM student_profiles
WHERE owner_id = '1ca456bd-f506-48d9-9834-4a3227e0038f';

