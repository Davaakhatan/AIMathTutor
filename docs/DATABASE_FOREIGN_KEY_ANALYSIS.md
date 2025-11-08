# Database Foreign Key Analysis

## Problem: Mixed Foreign Key References

The database schema has **inconsistent foreign key references**:
- Some tables reference `auth.users(id)`
- Other tables reference `public.profiles(id)`

This causes failures because:
1. `public.profiles` may not exist for all `auth.users`
2. RLS policies may not work correctly
3. Queries fail when profile doesn't exist

## Tables by Foreign Key Type

### ✅ Tables referencing `public.profiles(id)` (CORRECT - we ensure profiles exist):
- `achievements.user_id` → `public.profiles(id)`
- `daily_goals.user_id` → `public.profiles(id)`
- `difficulty_performance.user_id` → `public.profiles(id)`
- `problems.user_id` → `public.profiles(id)`
- `sessions.user_id` → `public.profiles(id)`
- `streaks.user_id` → `public.profiles(id)`
- `xp_data.user_id` → `public.profiles(id)`
- `concept_mastery.user_id` → `public.profiles(id)`

### ❌ Tables referencing `auth.users(id)` (PROBLEM - no profile check):
- `challenges.user_id` → `auth.users(id)`
- `conversation_summaries.user_id` → `auth.users(id)`
- `daily_problems_completion.user_id` → `auth.users(id)`
- `learning_goals.user_id` → `auth.users(id)`
- `referral_codes.user_id` → `auth.users(id)`
- `referrals.referrer_id` → `auth.users(id)`
- `referrals.referee_id` → `auth.users(id)`
- `shares.user_id` → `auth.users(id)`

## Solution Options

### Option 1: Change all to `public.profiles(id)` (RECOMMENDED)
- Ensures consistency
- All tables use same pattern
- `ensureProfileExists()` works for all

### Option 2: Keep mixed but ensure profiles exist
- Add `ensureProfileExists()` to all functions
- More complex, but preserves existing schema

## Recommendation

**Option 1** - Change all foreign keys to `public.profiles(id)` because:
1. Most tables already use it
2. We have `ensureProfileExists()` helper
3. Consistent pattern is easier to maintain
4. RLS policies work better with profiles

## Migration Required

Need to:
1. Drop foreign key constraints
2. Change `user_id` columns to reference `public.profiles(id)`
3. Ensure all users have profiles (via `ensureProfileExists()`)
4. Re-add foreign key constraints

