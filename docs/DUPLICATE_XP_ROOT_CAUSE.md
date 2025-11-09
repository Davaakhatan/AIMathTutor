# Root Cause: Duplicate XP & Streak Records

**Date**: November 9, 2025  
**Status**: IDENTIFIED & DOCUMENTED

---

## The Problem

Users were getting duplicate XP and Streak records in the database, causing:
- `duplicate key value violates unique constraint` errors
- Endless error logs
- Broken XP/Streak systems
- Had to disable entire gamification

---

## Root Cause Analysis

### Issue #1: Wrong `onConflict` Syntax ❌

**Location**: `services/supabaseDataService.ts` line 294-296

```typescript
const { error } = await supabase
  .from("xp_data")
  .upsert(updateData, {
    onConflict: "user_id,student_profile_id",  // ❌ WRONG!
  });
```

**Problem**: `onConflict: "user_id,student_profile_id"` does NOT work because:
1. This is **NOT a composite unique constraint** in Postgres
2. We have **TWO SEPARATE partial unique indexes**:
   - `idx_xp_data_user_unique` on `user_id` WHERE `student_profile_id IS NULL`
   - `idx_xp_data_profile_unique` on `student_profile_id` WHERE `student_profile_id IS NOT NULL`
3. Supabase `upsert()` doesn't know how to handle partial indexes
4. Result: **Always inserts, never updates** → duplicates!

**The Fix**: Use **conditional logic** instead of upsert:

```typescript
// CORRECT APPROACH:
// 1. Try UPDATE first
const { data: updated, error: updateError } = await supabase
  .from("xp_data")
  .update(updateData)
  .eq("user_id", userId)
  .is("student_profile_id", profileId || null)
  .select();

// 2. If no rows updated, then INSERT
if (!updated || updated.length === 0) {
  await supabase
    .from("xp_data")
    .insert(updateData);
}
```

---

### Issue #2: Multiple Simultaneous Inserts (Race Condition)

**Location**: Multiple places calling `createDefaultXPData()` at the same time

**Scenario**:
1. User logs in
2. `useXPData` hook loads → no data → calls `createDefaultXPData()`
3. `Daily Login` service starts → calls `getXPData()` → no data → calls `createDefaultXPData()`
4. `AuthContext` loads → calls `getXPData()` → no data → calls `createDefaultXPData()`
5. All 3 `INSERT` statements hit database at same time
6. First succeeds, others get duplicate key error

**Current "Fix"** (in `createDefaultXPData`):
```typescript
// Check if data already exists BEFORE inserting
const { data: existingData } = await checkQuery;
if (existingData && existingData.length > 0) {
  return existingData[0]; // Return existing instead of inserting
}

// Then insert...
const { data, error } = await supabase.from("xp_data").insert(defaultData);

// If duplicate key error (23505), fetch and return existing
if (error && error.code === "23505") {
  const { data: raceData } = await checkQuery;
  return raceData[0];
}
```

**Problem with current fix**: Still has a small race condition window between the check and insert.

**Better Fix**: Use a **distributed lock** or **"update-or-insert"** pattern:

```typescript
// Try to update first (won't create duplicates)
const { data: updated } = await supabase
  .from("xp_data")
  .update({ updated_at: new Date() }) // Dummy update to check existence
  .eq("user_id", userId)
  .is("student_profile_id", profileId)
  .select();

if (updated && updated.length > 0) {
  return updated[0]; // Exists, return it
}

// Only insert if update returned 0 rows
const { data: inserted } = await supabase
  .from("xp_data")
  .insert(defaultData)
  .select()
  .single();

return inserted;
```

---

### Issue #3: `upsert` on Partial Indexes

**Problem**: Supabase/PostgREST's `upsert()` requires a **named constraint**, but our unique constraints are **partial indexes**.

**What we have**:
```sql
CREATE UNIQUE INDEX idx_xp_data_user_unique
  ON xp_data(user_id)
  WHERE student_profile_id IS NULL;  -- Partial index (has WHERE clause)
```

**What `upsert()` expects**:
```sql
ALTER TABLE xp_data
  ADD CONSTRAINT xp_data_user_unique
  UNIQUE (user_id, student_profile_id);  -- Named constraint, no WHERE clause
```

**Why partial indexes don't work with `upsert()`**:
- PostgREST can't reference partial indexes in `ON CONFLICT`
- `onConflict` needs a constraint name or column list
- Partial indexes don't have names that PostgREST can use

**Solutions**:

1. **Change to named constraints** (requires schema change):
```sql
ALTER TABLE xp_data
  ADD CONSTRAINT xp_data_unique
  UNIQUE NULLS NOT DISTINCT (user_id, student_profile_id);
```

2. **Don't use `upsert()`** - use update-then-insert pattern (recommended):
```typescript
// Safer and more explicit
const updated = await supabase.from("xp_data").update(data).match(filter);
if (!updated || updated.length === 0) {
  await supabase.from("xp_data").insert(data);
}
```

---

## Where Duplicates Are Created

### Primary Sources:

1. **`services/supabaseDataService.ts`**
   - `createDefaultXPData()` - Line 158
   - `updateXPData()` - Line 262
   - `createDefaultStreakData()` - Line 377
   - `updateStreakData()` - Line 462

2. **`app/api/referral/award-rewards/route.ts`**
   - Lines 90-101: Inserts XP for referee
   - Lines 123-134: Inserts XP for referrer

3. **`services/dailyLoginService.ts`**
   - Line 86: Calls `updateXPData()` which uses broken upsert

4. **`contexts/AuthContext.tsx`**
   - Lines 876-886: Creates localStorage XP (not DB, but triggers loading)

### Secondary Sources (Indirect):

- `hooks/useXPData.ts` - Calls `getXPData()` which calls `createDefaultXPData()`
- `hooks/useStreakData.ts` - Calls `getStreakData()` which calls `createDefaultStreakData()`
- `services/orchestrator.ts` - Would call `updateXPData()` when enabled

---

## The Complete Fix

### Step 1: Fix Database (✅ DONE)
- Removed duplicates
- Added unique indexes
- Fixed RLS

### Step 2: Fix `updateXPData` (TODO)

Replace broken `upsert()` with safe update-or-insert:

```typescript
export async function updateXPData(
  userId: string,
  xpData: Partial<XPData>,
  profileId?: string | null
): Promise<boolean> {
  try {
    const supabase = await getSupabaseForDataService(); // Use admin on server
    if (!supabase) return false;

    const effectiveProfileId = profileId !== undefined ? profileId : null;
    const { recent_gains, ...dbFields } = xpData;

    const updateData: any = {
      ...dbFields,
      user_id: userId,
      updated_at: new Date().toISOString(),
      student_profile_id: effectiveProfileId,
    };

    // SAFE APPROACH: Try update first
    let query = supabase
      .from("xp_data")
      .update(updateData)
      .eq("user_id", userId);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data: updated, error: updateError } = await query.select();

    // If update succeeded, we're done
    if (updated && updated.length > 0) {
      logger.debug("XP data updated", { userId, profileId: effectiveProfileId });
      return true;
    }

    // If no rows updated, INSERT new record
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from("xp_data")
        .insert(updateData);

      if (insertError) {
        // If duplicate (race condition), that's OK - another request created it
        if (insertError.code === "23505") {
          logger.debug("XP record created by concurrent request", { userId });
          return true;
        }
        logger.error("Error inserting XP data", { error: insertError.message, userId });
        return false;
      }

      logger.debug("XP data inserted", { userId, profileId: effectiveProfileId });
      return true;
    }

    return true;
  } catch (error) {
    logger.error("Error in updateXPData", { error, userId });
    return false;
  }
}
```

### Step 3: Fix `updateStreakData` (TODO)
- Same pattern as XP
- Update first, insert if needed
- Handle race conditions gracefully

### Step 4: Fix Referral API (TODO)
- Use `updateXPData()` instead of direct insert
- Let the service handle update-or-insert logic

### Step 5: Add Retry Logic (TODO)
- If update fails with transient error, retry once
- If insert fails with duplicate key, fetch existing
- Never throw errors, always return gracefully

---

## Prevention Checklist

### Before Re-Enabling XP/Streak:

- [ ] Replace `upsert()` with update-then-insert in `updateXPData()`
- [ ] Replace `upsert()` with update-then-insert in `updateStreakData()`
- [ ] Use `getSupabaseForDataService()` (not `getSupabaseClient()`) on server
- [ ] Add defensive checks in `createDefaultXPData()` (check before insert)
- [ ] Fix referral API to use `updateXPData()` service
- [ ] Test with 3 concurrent logins → should create only 1 XP record per user

### Testing Commands:

```bash
# Test 1: Create XP record
curl -X POST http://localhost:3002/api/test/create-xp \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-123", "profileId": null}'

# Test 2: Update XP record (should not create duplicate)
curl -X POST http://localhost:3002/api/test/update-xp \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-123", "xp": 100}'

# Test 3: Check no duplicates
curl http://localhost:3002/api/test/check-duplicates
```

---

## Summary

### What Caused Duplicates:
1. ❌ `upsert()` with `onConflict` on partial indexes (doesn't work)
2. ❌ Multiple concurrent calls to `createDefaultXPData()`
3. ❌ Race condition window between check and insert
4. ❌ Using client-side Supabase on server (wrong permissions)

### How to Fix:
1. ✅ Clean database (DONE)
2. ✅ Add unique constraints (DONE)
3. ⏳ Replace `upsert()` with update-then-insert (IN PROGRESS)
4. ⏳ Use correct Supabase client (server vs client)
5. ⏳ Add defensive checks and retry logic
6. ⏳ Test thoroughly before re-enabling

---

**Next**: Implement the fixes in Phase 1!

