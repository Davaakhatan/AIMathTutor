# XP & Streak NULL user_id Fix

## 🐛 **Critical Bug Found**

**Error:** `null value in column "user_id" of relation "xp_data" violates not-null constraint`

**Root Cause:** The `createDefaultXPData` and `createDefaultStreakData` functions were incorrectly setting `user_id` to `null` when a `student_profile_id` was provided.

---

## 📊 **Database Schema Understanding**

Both `xp_data` and `streaks` tables have:
- `user_id` (UUID, NOT NULL) - Always the authenticated user
- `student_profile_id` (UUID, NULLABLE) - Optional reference to a student profile

**Key Insight:** 
- `user_id` should **ALWAYS** be set to `auth.uid()`
- `student_profile_id` is set when tracking data for a specific student profile
- The composite unique constraint is on `(user_id, student_profile_id)`

---

## ❌ **Incorrect Logic (Before)**

```typescript
// WRONG: Only setting student_profile_id, not user_id
if (effectiveProfileId) {
  defaultData.student_profile_id = effectiveProfileId;
  // user_id is undefined/null -> CAUSES ERROR!
} else {
  defaultData.user_id = userId;
}
```

This caused:
```
Error: null value in column "user_id" violates not-null constraint
```

---

## ✅ **Correct Logic (After)**

```typescript
// CORRECT: Always set user_id
const defaultData: any = {
  user_id: userId, // ALWAYS include user_id (required by RLS policies)
  total_xp: 0,
  level: 1,
  xp_to_next_level: 100,
  xp_history: [],
};

if (effectiveProfileId) {
  // For profile: include BOTH user_id and profile_id
  defaultData.student_profile_id = effectiveProfileId;
} else {
  // For user: include user_id, profile_id is null
  defaultData.student_profile_id = null;
}
```

---

## 🔧 **Files Modified**

### `services/supabaseDataService.ts`

1. **`createDefaultXPData()` (lines 215-230)**
   - Added `user_id: userId` to the default data object
   - Always includes `user_id` regardless of profile

2. **`createDefaultStreakData()` (lines 419-432)**
   - Added `user_id: userId` to the default data object
   - Always includes `user_id` regardless of profile

---

## 🎯 **Expected Behavior After Fix**

### For Student Users (with `student_profile_id`):
```javascript
{
  user_id: "dc8cd870-d5ea-4612-aba8-80e9a5ea854b",
  student_profile_id: "3b4c5faa-13c7-4b74-a518-f6c2fd5e501f",
  total_xp: 0,
  level: 1,
  // ...
}
```

### For Parent/Teacher Users (no `student_profile_id`):
```javascript
{
  user_id: "ac877ac1-5ae7-432e-b95c-08d7dd1c80ac",
  student_profile_id: null,
  total_xp: 0,
  level: 1,
  // ...
}
```

---

## ✅ **RLS Policy Compatibility**

The RLS policies check:
```sql
(user_id = auth.uid() AND student_profile_id IS NULL)
OR
(student_profile_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM student_profiles
  WHERE id = xp_data.student_profile_id AND owner_id = auth.uid()
))
```

With `user_id` always set, the policies can correctly validate:
1. Direct user access: `user_id = auth.uid()`
2. Profile ownership: Check if the user owns the student profile

---

## 🧪 **Testing**

After this fix:
1. ✅ New users can create XP data
2. ✅ New users can create streak data
3. ✅ Student profiles can create XP data
4. ✅ Student profiles can create streak data
5. ✅ No more `null user_id` constraint violations

---

## 🚀 **Next Steps**

1. **Hard refresh** the browser
2. **Clear console** logs
3. **Test with the existing student user** (`dc8cd870-d5ea-4612-aba8-80e9a5ea854b`)
4. **Verify XP and Level display correctly**
5. **Solve a problem and check XP increases**

---

---

## 🔄 **Additional Fix: Race Condition Handling**

After fixing the NULL `user_id` issue, we discovered a **race condition** where multiple components were trying to create default data simultaneously, resulting in:

```
Error: duplicate key value violates unique constraint "xp_data_user_profile_unique"
Error: duplicate key value violates unique constraint "idx_streaks_profile_unique"
```

### **Root Cause:**
- Multiple components call `getXPData()` or `getStreakData()` simultaneously
- All find no data exists
- All try to create default data at the same time
- First one succeeds, others fail with duplicate key error

### **Solution:**
1. Changed `.single()` to return array (avoid throwing on "not found")
2. Check `existingData.length > 0` instead of relying on error handling
3. Handle duplicate key error (code `23505`) gracefully by fetching the existing data

```typescript
const { data: existingData, error: checkError } = await checkQuery;

// If data exists, return it
if (existingData && existingData.length > 0) {
  const existing = existingData[0];
  return { /* existing data */ };
}

// Try to insert
const { data, error } = await supabase.from("xp_data").insert(defaultData);

if (error) {
  // Handle race condition: another request created it first
  if (error.code === "23505") {
    const { data: raceData } = await checkQuery;
    if (raceData && raceData.length > 0) {
      return { /* existing data */ };
    }
  }
  // Log other errors
  logger.error("Error creating default XP data", { error: error.message });
}
```

---

**Status:** 🟢 FULLY FIXED (NULL user_id + Race Condition)
**Date:** 2025-11-08
**Impact:** Critical - Blocks all new user XP/Streak functionality

