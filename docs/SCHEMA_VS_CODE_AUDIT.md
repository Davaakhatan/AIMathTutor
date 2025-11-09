# Schema vs Code Audit
## All Mismatches Found

**Date**: November 9, 2025  
**Purpose**: Identify ALL places where code expects different columns than schema

---

## Schema (Source of Truth)

### daily_problems
- `id`, `date`, `problem_text`, `problem_type`, `difficulty`, `created_at`

### sessions  
- `id`, `user_id`, `student_profile_id`, `problem_id`, `difficulty_mode`, `messages`, `is_completed`, `completed_at`, `created_at`, `updated_at`

### daily_problems_completion
- `id`, `user_id`, `student_profile_id`, `daily_problem_id`, `date`, `is_solved`, `completed_at`, `time_spent_seconds`, `hints_used`, `created_at`, `updated_at`

### problems
- `id`, `user_id`, `student_profile_id`, `text`, `type`, `difficulty`, `image_url`, `parsed_data`, `is_bookmarked`, `is_generated`, `source`, `solved_at`, `created_at`, `updated_at`, `attempts`, `hints_used`, `time_spent_seconds`, `solution_steps`

### achievements
- `id`, `user_id`, `student_profile_id`, `achievement_id`, `achievement_name`, `unlocked_at`, `created_at`, `achievement_type`

---

## Code Expecting Wrong Columns

### 1. dailyProblemService.ts
- ❌ Expects: `topic`, `subject`, `hints` in `daily_problems`
- ✅ Schema has: Only `date`, `problem_text`, `problem_type`, `difficulty`
- **Fix**: Remove code that queries/inserts these columns

### 2. contextManager.ts / app/api/chat
- ❌ Expects: `context`, `last_activity` in `sessions`
- ✅ Schema has: Only `messages`, `created_at`, `updated_at`
- **Fix**: Remove code that updates `last_activity`, use `updated_at` instead

### 3. app/api/daily-problem/route.ts
- ❌ Expects: `problem_text` in `daily_problems_completion`
- ✅ Schema has: Only `daily_problem_id` (reference)
- **Fix**: Don't select/insert `problem_text`, use JOIN if needed

### 4. services/supabaseDataService.ts (saveProblem)
- ❌ Expects: `time_spent` in `problems`
- ✅ Schema has: `time_spent_seconds`
- **Fix**: Use `time_spent_seconds` everywhere

### 5. Leaderboard / Achievement queries
- ❌ Expects: `achievement_type` 
- ✅ Schema has: `achievement_id` + `achievement_type` (we added)
- **Fix**: Use `achievement_id` as primary, `achievement_type` is alias

### 6. dailyProblemService.ts (server-side)
- ❌ Uses: `getSupabaseClient()` on server
- ✅ Should use: `getSupabaseAdmin()`
- **Fix**: Replace all `getSupabaseClient()` with `getSupabaseAdmin()` in API routes/services

---

## Files to Fix

1. `services/dailyProblemService.ts` - Use admin client, remove topic/subject/hints
2. `app/api/daily-problem/route.ts` - Fix completion queries
3. `services/contextManager.ts` - Remove last_activity, use updated_at
4. `app/api/chat/route.ts` - Remove session update calls for missing columns
5. `services/supabaseDataService.ts` - Use time_spent_seconds
6. `hooks/useAchievements.ts` - Use achievement_id correctly
7. `components/unified/XPContent.tsx` - ✅ Already fixed (removed infinite loop)

---

## Priority Order

### P0 (Breaks everything):
1. ✅ XPContent infinite loop - FIXED
2. dailyProblemService - Use admin client
3. sessions updates - Remove missing columns

### P1 (Features broken):
4. daily_problems queries - Remove missing columns
5. daily_problems_completion - Fix joins
6. problems.time_spent - Use correct column

### P2 (Nice to have):
7. achievements - Use achievement_id

---

**Next**: I'll fix ALL these files systematically!

