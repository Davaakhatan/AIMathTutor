# 🔧 Comprehensive Troubleshooting Guide

**Last Updated:** November 8, 2025  
**Status:** Active Development - Fixing Performance & Loading Issues

---

## 🚨 **CURRENT CRITICAL ISSUES**

### **Issue #1: TypeError & ReferenceError in Console** ❌ ACTIVE

**Symptoms:**
```
[ERROR] Error loading streak data from database { error: TypeError }
[ERROR] Error in saveDailyGoal { error: ReferenceError }
[ERROR] Error in saveStudySession { error: ReferenceError }
```

**Root Cause:**
- JavaScript code is crashing BEFORE reaching database
- `TypeError` = trying to access property of `undefined`/`null`
- `ReferenceError` = trying to use variable/function that doesn't exist

**Next Steps:**
1. ✅ **DONE**: Removed slow `.auth.getUser()` call from `ensureProfileExists`
2. 🔄 **TODO**: Expand error logging to show actual error messages (not just type)
3. 🔄 **TODO**: Find which line is throwing the error

**Action Plan:**
```typescript
// Add this to all catch blocks:
catch (error) {
  logger.error("Error details", { 
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
}
```

---

### **Issue #2: Data Not Showing / Just Loading** ⏳ ACTIVE

**Symptoms:**
- XP/Level shows loading state forever
- Leaderboard shows "Loading..." but never completes
- No data appears despite successful login

**Root Cause Analysis:**
```
[INFO] Loading XP data from database { userId: "xxx", profileId: "xxx" }
(no follow-up log - means function crashed or returned null)
```

**What's Missing:**
- ❌ No "XP data fetched successfully" log
- ❌ No "Creating default XP data" log  
- ❌ No error log with details

**This Means:**
1. Function is crashing silently (TypeError/ReferenceError)
2. OR returning `null` without logging why
3. OR database query hanging (unlikely after removing timeouts)

**Next Steps:**
1. Add detailed error logging with stack traces
2. Add console.error() calls (harder to miss than logger)
3. Test with a fresh new user account

---

### **Issue #3: Performance - Still Slow** 🐌 IMPROVING

**Recent Fixes:**
- ✅ Removed 29 `ensureProfileExists` timeout wrappers
- ✅ Removed slow `.auth.getUser()` call
- ✅ Optimized leaderboard queries with Promise.all

**Remaining Issues:**
- Leaderboard still fetching twice (duplicate calls)
- Multiple components loading same data
- No data caching between re-renders

---

## 📊 **DEBUGGING CHECKLIST**

### **Step 1: Check Console for Actual Error Messages**

**Current Logs (Not Helpful):**
```
[ERROR] Error loading streak data { error: TypeError }
```

**Need This Instead:**
```
[ERROR] Error loading streak data {
  error: TypeError,
  message: "Cannot read property 'id' of undefined",
  stack: "at getStreakData (supabaseDataService.ts:350:20)..."
}
```

**Fix:** Update all `catch` blocks to log full error details

---

### **Step 2: Test Data Flow**

**Test Sequence:**
1. Sign out completely
2. Clear localStorage (`localStorage.clear()` in console)
3. Sign in as existing user
4. Check console for:
   - ✅ "Loading XP data from database"
   - ✅ "XP data fetched successfully" OR "Creating default XP data"
   - ✅ "Default XP data created successfully"
   - ❌ Any TypeErrors or ReferenceErrors

---

### **Step 3: Database Verification**

**Check if data exists:**
```sql
-- In Supabase SQL Editor:
SELECT * FROM xp_data WHERE user_id = 'USER_ID_HERE';
SELECT * FROM streaks WHERE user_id = 'USER_ID_HERE';
SELECT * FROM profiles WHERE id = 'USER_ID_HERE';
```

**Expected Results:**
- `profiles`: Should have 1 row
- `xp_data`: Should have 1 row (or 0 if new user)
- `streaks`: Should have 1 row (or 0 if new user)

---

## 🔥 **IMMEDIATE ACTION PLAN**

### **Phase 1: Better Error Logging** (15 min)

1. Update `services/supabaseDataService.ts`:
   - Add full error details to all catch blocks
   - Add `console.error()` in addition to `logger.error()`
   - Log function entry/exit for critical paths

2. Update hooks (`useXPData.ts`, `useStreakData.ts`):
   - Add error boundaries
   - Log when data is `null` vs loading

3. Test and capture REAL error messages

---

### **Phase 2: Fix Broken Code** (30 min)

Based on error messages from Phase 1:
1. Fix TypeError issues (accessing undefined properties)
2. Fix ReferenceError issues (missing imports/variables)
3. Add null checks and fallbacks

---

### **Phase 3: Optimize Loading** (45 min)

1. **Prevent duplicate calls:**
   - Add `useRef` to track if data is already loading
   - Skip re-fetch if data exists and is fresh

2. **Cache data properly:**
   - Use React Query or SWR for automatic caching
   - OR implement simple cache with timestamps

3. **Loading states:**
   - Show skeleton loaders immediately
   - Progressive loading (show cached, update from DB)

---

### **Phase 4: Test Everything** (60 min)

Test matrix:
- ✅ New user signup
- ✅ Existing user login
- ✅ User logout/login
- ✅ Switch between profiles (if student)
- ✅ Each feature: XP, Streaks, Challenges, Leaderboard, Achievements, History, Bookmarks, Dashboard

---

## 🛠️ **CODE FIXES TO IMPLEMENT**

### **Fix 1: Better Error Logging**

**File:** `services/supabaseDataService.ts`

```typescript
// Find all catch blocks and replace:
catch (error) {
  logger.error("Error in getXPData", { error, userId });
  return null;
}

// With:
catch (error) {
  const errorDetails = {
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    userId,
    profileId
  };
  logger.error("Error in getXPData", errorDetails);
  console.error("[getXPData] Error:", errorDetails); // Also log to console
  return null;
}
```

---

### **Fix 2: Add Null Checks**

**File:** `services/supabaseDataService.ts`

```typescript
// Before (unsafe):
const xpRow = data[0];
return {
  total_xp: xpRow.total_xp || 0,
  // ...
};

// After (safe):
if (!data || !data[0]) {
  logger.warn("No data returned from query", { userId, profileId });
  return await createDefaultXPData(userId, profileId);
}

const xpRow = data[0];
return {
  total_xp: xpRow?.total_xp ?? 0,
  level: xpRow?.level ?? 1,
  // ...
};
```

---

### **Fix 3: Prevent Duplicate Calls**

**File:** `hooks/useXPData.ts`

```typescript
// Add loading flag
const loadingRef = useRef(false);

useEffect(() => {
  // Skip if already loading
  if (loadingRef.current) {
    logger.debug("XP data already loading, skipping duplicate call");
    return;
  }

  loadingRef.current = true;
  
  const load = async () => {
    try {
      // ... existing code
    } finally {
      loadingRef.current = false;
    }
  };
  
  load();
}, [user?.id, activeProfile?.id]);
```

---

## 📝 **TESTING COMMANDS**

### **Clear Everything and Start Fresh:**
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### **Check What's in LocalStorage:**
```javascript
// In browser console:
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('aitutor-')) {
    console.log(key, localStorage.getItem(key));
  }
});
```

### **Manually Test Database:**
```javascript
// In browser console:
const testDB = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log("User:", user?.id);
  
  const { data: xp } = await supabase
    .from('xp_data')
    .select('*')
    .eq('user_id', user.id)
    .is('student_profile_id', null);
  console.log("XP Data:", xp);
};
testDB();
```

---

## 🎯 **SUCCESS CRITERIA**

### **Performance:**
- ✅ Page loads in < 3 seconds
- ✅ No timeout errors in console
- ✅ Leaderboard appears in < 2 seconds

### **Data Integrity:**
- ✅ XP persists across logout/login
- ✅ Streaks persist correctly
- ✅ All user data shows immediately

### **Error Handling:**
- ✅ No TypeErrors or ReferenceErrors
- ✅ Clear error messages if something fails
- ✅ Graceful fallbacks (show 0 XP instead of crash)

---

## 🔄 **NEXT IMMEDIATE STEPS**

1. **NOW**: Implement better error logging (15 min)
2. **NEXT**: Refresh app and capture real error messages
3. **THEN**: Fix the actual TypeErrors/ReferenceErrors
4. **FINALLY**: Optimize and test thoroughly

---

## 📞 **NEED HELP?**

**When reporting issues, provide:**
1. Full console output (copy ALL red errors)
2. Network tab (check if requests are failing)
3. localStorage contents (user ID, cached data)
4. Steps to reproduce

**Best debugging:**
```javascript
// Run this in console when you see "just loading":
console.log("=== DEBUG INFO ===");
console.log("User:", await supabase.auth.getUser());
console.log("LocalStorage:", {...localStorage});
console.log("XP Hook State:", /* get from React DevTools */);
```

---

**Status**: Document ready for implementation  
**Priority**: CRITICAL - Blocking all features  
**ETA**: 2-3 hours to fully resolve

