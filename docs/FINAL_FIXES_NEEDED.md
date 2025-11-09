# Final Fixes Needed
## Systematic Fix List

**Date**: November 9, 2025 06:00 AM  
**Status**: Core works, need to fix schema mismatches  
**Approach**: Fix code to match clean schema

---

## What's Working ✅

1. **Core Chat** - AI tutoring works
2. **Authentication** - Signup/login works  
3. **Profile Creation** - Auto-creates for students
4. **Daily Login XP** - Awards 60 XP on first login (once!)
5. **Deduplication** - Prevents double-awards
6. **Optimistic Loading** - XP/Streak show instantly

---

## Critical Bugs Still Present 🔴

### 1. ProfileId Being Passed for Students
**Issue**: Code passes `student_profile_id` when it should pass `null`

**Evidence**:
```
profileId: "b26f93e5-62cc-4687-91e9-0990bc9060b8"
```

**Why it's a problem**:
- Unique constraints only work when `student_profile_id IS NULL`
- When profileId is set, no constraint exists!
- Creates unlimited duplicates

**Where it's happening**:
- Something is overriding the `profileIdToUse = null` logic
- Could be in ProgressHub, Dashboard, or other components

**FIX**: Find ALL places calling `getXPData()` or `updateXPData()` with `activeProfile.id` for students and force it to `null`.

---

### 2. Daily Problem Not Saving
**Issue**: Missing columns prevent saving to database

**Errors**:
- `topic` column doesn't exist in `daily_problems`
- `problem_date` vs `date` mismatch

**Result**: Every user generates their own problem instead of sharing one

**FIX**: Update code to use correct column names OR add columns to schema

---

### 3. Session Persistence Failing
**Issue**: Missing columns in `sessions` table

**Errors**:
- `context` column doesn't exist
- `last_activity` column doesn't exist

**Result**: Sessions don't persist to database (only in-memory)

**FIX**: Add missing columns to schema OR update code to not use them

---

### 4. Problems Not Saving
**Issue**: Missing column

**Error**:
- `time_spent` vs `time_spent_seconds` mismatch

**FIX**: Code should use `time_spent_seconds` everywhere

---

### 5. Achievements Not Loading
**Issue**: Column name mismatch

**Error**:
- Code queries `achievement_type`
- Schema has `achievement_id` (we added `achievement_type` as copy)

**FIX**: Code should primarily use `achievement_id`

---

## Recommended Fix Order

### Phase A: Stop the Bleeding (15 min)
1. ✅ Drop materialized view trigger (DONE)
2. ✅ Clean XP data (DONE)
3. ⏳ Fix profileId being passed for students
4. ⏳ Test: Signup → 60 XP → No duplicates

### Phase B: Fix Column Mismatches (30 min)
5. Add missing columns to schema (safer than changing code)
   - `daily_problems`: add `topic`, `subject`
   - `sessions`: add `context`, `last_activity`
   - `problems`: `time_spent` already exists
6. Test: All features work without column errors

### Phase C: Re-enable Features (30 min)
7. Daily Problem saves to database
8. Sessions persist correctly  
9. Achievements load
10. Test: Everything works end-to-end

---

## Decision Point

### Option A: Add Columns to Schema (Recommended)
**Pro**: Faster, less risky, preserves old code logic  
**Con**: Schema has some redundant columns

**SQL**:
```sql
ALTER TABLE daily_problems ADD COLUMN topic text, ADD COLUMN subject text;
ALTER TABLE sessions ADD COLUMN context jsonb, ADD COLUMN last_activity timestamptz;
-- time_spent already added
```

### Option B: Fix All Code
**Pro**: Clean schema, no redundancy  
**Con**: Takes longer, more files to change, higher risk of bugs

**Files to change**: 10-15 files

---

## My Recommendation

**Do Option A (Add Columns)**:
1. Faster (5 minutes vs 2 hours)
2. Less risky (doesn't touch working code)
3. Can clean up later
4. Gets you to production today

Once everything works, we can create a v3 schema and migrate cleanly.

---

## The ProfileId Bug

This is the #1 priority. Looking at logs:

```
userId: "6fbdfc40-f26c-4e21-b268-650e0581fa3c"
profileId: "b26f93e5-62cc-4687-91e9-0990bc9060b8"  <-- SHOULD BE NULL!
```

**Where to check**:
1. `components/unified/ProgressHub.tsx` - Uses `useXPData()`
2. `components/unified/DashboardContent.tsx` - Uses `useXPData()`
3. Any component that calls XP hooks

**The hooks SHOULD be passing null** (line 50 in useXPData.ts):
```typescript
const profileIdToUse = (userRole === "student") ? null : (activeProfile?.id || null);
```

But something is overriding this or userRole is not "student"?

**Debug**: Add logging to see what `userRole` is when the query runs.

---

## Next Steps

1. **Run the DROP SQL** (remove trigger/view)
2. **Add the missing columns** (Option A)
3. **Find profileId bug** (add debug logging)
4. **Test clean signup flow**

Then we're done! 🎯

