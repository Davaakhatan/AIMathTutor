-- CHECK XP DATA FOR THIS USER
SELECT * FROM xp_data 
WHERE user_id = 'ba4a0980-688d-4485-9073-4b37778dcbdf'
ORDER BY updated_at DESC;

-- CHECK STREAK DATA FOR THIS USER
SELECT * FROM streaks 
WHERE user_id = 'ba4a0980-688d-4485-9073-4b37778dcbdf'
ORDER BY updated_at DESC;

-- CHECK PROFILE
SELECT id, role, current_student_profile_id FROM profiles
WHERE id = 'ba4a0980-688d-4485-9073-4b37778dcbdf';

