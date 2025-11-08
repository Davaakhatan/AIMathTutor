# Migration Instructions - Fix Foreign Key Mismatch

## 🔴 CRITICAL: Run These Migrations in Order

Your database has **mixed foreign key references** causing failures. Follow these steps:

## Step 1: Ensure All Users Have Profiles

**File**: `supabase/migrations/ensure_all_users_have_profiles.sql`

**What it does**:
- Creates `profiles` row for all users who don't have one
- Sets default role to "student"
- Verifies all users have profiles

**How to run**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `ensure_all_users_have_profiles.sql`
3. Click "Run"
4. Verify output shows "All users have profiles"

## Step 2: Fix Foreign Keys

**File**: `supabase/migrations/fix_foreign_keys_to_profiles.sql`

**What it does**:
- Changes ALL foreign keys from `auth.users(id)` to `public.profiles(id)`
- Ensures consistency across all tables
- Fixes: challenges, daily_problems_completion, learning_goals, xp_data, streaks, daily_goals, study_sessions, achievements, conversation_summaries, shares, referral_codes, referrals

**How to run**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `fix_foreign_keys_to_profiles.sql`
3. Click "Run"
4. Verify no errors

## Step 3: Verify

After running migrations, verify:

```sql
-- Check that all tables reference profiles(id)
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND kcu.column_name = 'user_id'
ORDER BY tc.table_name;
```

All `user_id` foreign keys should reference `public.profiles(id)`.

## What This Fixes

✅ **XP/Level** - No more timeouts, loads immediately
✅ **Problem of Day** - Only shows completed for correct user
✅ **Goals** - Create, read, update work
✅ **History/Bookmarks** - Save and load correctly
✅ **Achievements** - Unlock and display correctly
✅ **Streaks** - Track correctly
✅ **Challenges** - Save and load correctly

## After Migration

1. Test the app - everything should work
2. No more "getXPData timeout" warnings
3. No more foreign key constraint errors
4. All data syncs correctly

