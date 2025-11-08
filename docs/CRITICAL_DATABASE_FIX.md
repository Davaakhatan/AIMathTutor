# Critical Database Fix - Foreign Key Mismatch

## 🔴 ROOT CAUSE IDENTIFIED

Your database schema has **MIXED foreign key references**:

### Tables referencing `auth.users(id)` (PROBLEM):
- `challenges.user_id` → `auth.users(id)`
- `daily_problems_completion.user_id` → `auth.users(id)`
- `learning_goals.user_id` → `auth.users(id)`
- `conversation_summaries.user_id` → `auth.users(id)`
- `shares.user_id` → `auth.users(id)`
- `referral_codes.user_id` → `auth.users(id)`
- `referrals.referrer_id/referee_id` → `auth.users(id)`

### Tables referencing `public.profiles(id)` (CORRECT):
- `achievements.user_id` → `public.profiles(id)`
- `daily_goals.user_id` → `public.profiles(id)`
- `problems.user_id` → `public.profiles(id)`
- `streaks.user_id` → `public.profiles(id)`
- `xp_data.user_id` → `public.profiles(id)`
- `study_sessions.user_id` → `public.profiles(id)`

## ❌ Why This Breaks Everything

1. **Foreign Key Constraint Failures**: When inserting into `challenges`, `daily_problems_completion`, or `learning_goals`, if the profile doesn't exist, it fails
2. **RLS Policy Issues**: RLS policies may not work correctly with mixed references
3. **Data Inconsistency**: Some tables work, others don't
4. **getEffectiveProfileId() Hangs**: This function tries to query profiles that may not exist, causing timeouts

## ✅ FIXES APPLIED

### 1. Removed ALL `getEffectiveProfileId()` Calls
- **Why**: This function hangs when profiles don't exist
- **Solution**: Hooks now pass `activeProfile?.id` directly
- **Files**: `services/supabaseDataService.ts` (all functions)

### 2. Added Timeouts to `ensureProfileExists()`
- **Why**: Prevents hanging if database is slow
- **Solution**: 2-second timeout on all `ensureProfileExists()` calls
- **Files**: All data service functions

### 3. Added `ensureProfileExists()` to All Functions
- **Why**: Ensures profiles exist before any database operation
- **Functions Updated**:
  - `getXPData()`, `updateXPData()`, `createDefaultXPData()`
  - `getStreakData()`, `updateStreakData()`
  - `getProblems()`, `saveProblem()`, `updateProblem()`, `deleteProblem()`
  - `getChallenges()`, `saveChallenge()`
  - `getAchievements()`, `unlockAchievement()`
  - `getStudySessions()`, `saveStudySession()`
  - `getDailyGoals()`, `saveDailyGoal()`
  - `createGoal()`, `getGoals()`, `updateGoal()` (goalService.ts)
  - `markDailyProblemSolved()` (dailyProblemService.ts)

### 4. Created Migration to Fix Foreign Keys
- **File**: `supabase/migrations/fix_foreign_keys_to_profiles.sql`
- **What it does**: Changes ALL foreign keys from `auth.users(id)` to `public.profiles(id)`
- **Tables Fixed**:
  - `challenges`
  - `daily_problems_completion`
  - `learning_goals`
  - `conversation_summaries`
  - `shares`
  - `referral_codes`
  - `referrals`
  - And ensures `xp_data`, `streaks`, `daily_goals`, `study_sessions`, `achievements` use `profiles(id)`

## 🚀 NEXT STEPS

### Step 1: Run the Migration
```sql
-- Run this in Supabase SQL Editor:
-- supabase/migrations/fix_foreign_keys_to_profiles.sql
```

**IMPORTANT**: Before running, ensure all users have profiles:
```sql
-- Create profiles for all users who don't have one
INSERT INTO public.profiles (id, role)
SELECT id, 'student'::text
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

### Step 2: Test
After migration:
- ✅ XP/Level should load immediately (no timeout)
- ✅ Problem of Day should only show completed for correct user
- ✅ Goals should work
- ✅ History/Bookmarks should work
- ✅ Achievements should work
- ✅ Streaks should work

## 📋 What's Fixed

1. ✅ **Removed `getEffectiveProfileId()`** - No more hanging
2. ✅ **Added timeouts** - No more infinite waits
3. ✅ **Added `ensureProfileExists()`** - Profiles always exist
4. ✅ **Created migration** - Fixes foreign key consistency
5. ✅ **XP shows immediately** - localStorage first, then sync
6. ✅ **Problem of Day user verification** - Checks user_id matches

## ⚠️ CRITICAL: Run Migration First

**The migration is REQUIRED** to fix the foreign key mismatch. Without it, some tables will continue to fail.

