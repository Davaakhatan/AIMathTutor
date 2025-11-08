-- Check XP data for the user in the logs
-- User ID: 1ca456bd-f506-48d9-9834-4a3227e0038f
-- Profile ID: ae073611-957b-4496-9171-293d418b3ae6

-- Check profiles table
SELECT 'profiles' as table_name, * FROM profiles 
WHERE id = '1ca456bd-f506-48d9-9834-4a3227e0038f';

-- Check XP data (user-level - no profile)
SELECT 'xp_data (user)' as table_name, * FROM xp_data 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f' 
AND student_profile_id IS NULL;

-- Check XP data (profile-level)
SELECT 'xp_data (profile)' as table_name, * FROM xp_data 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f' 
AND student_profile_id = 'ae073611-957b-4496-9171-293d418b3ae6';

-- Check XP data (ALL for this user, any profile)
SELECT 'xp_data (all)' as table_name, * FROM xp_data 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f';

-- Check streaks
SELECT 'streaks' as table_name, * FROM streaks 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f';

-- Check problems solved
SELECT 'problems (solved)' as table_name, COUNT(*) as count FROM problems 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f' 
AND status = 'solved';

-- Check daily problems completion
SELECT 'daily_problems_completion' as table_name, * FROM daily_problems_completion 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f'
ORDER BY completed_at DESC
LIMIT 5;

