-- CRITICAL: Run this BEFORE fix_foreign_keys_to_profiles.sql
-- This ensures all users have profiles before changing foreign keys

-- Create profiles for all users who don't have one
-- Use role from user_metadata if available, otherwise default to 'student'
INSERT INTO public.profiles (id, role, created_at, updated_at)
SELECT 
  id, 
  CASE 
    -- Check if role exists in raw_user_meta_data and is valid
    WHEN raw_user_meta_data->>'role' IN ('student', 'parent', 'teacher', 'admin') 
      THEN raw_user_meta_data->>'role'
    -- Check if role exists in raw_app_meta_data (some setups use this)
    WHEN raw_app_meta_data->>'role' IN ('student', 'parent', 'teacher', 'admin')
      THEN raw_app_meta_data->>'role'
    -- Default to student if no valid role found
    ELSE 'student'
  END::text as role,
  COALESCE(created_at, NOW()) as created_at,
  NOW() as updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Verify all users have profiles
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Still % users without profiles after migration', missing_count;
  ELSE
    RAISE NOTICE 'All users have profiles - safe to proceed with foreign key migration';
  END IF;
END $$;

