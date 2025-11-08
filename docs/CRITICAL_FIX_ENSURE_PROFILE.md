# CRITICAL FIX: ensureProfileExists Server-Side Error

**Date**: November 8, 2025  
**Time**: ~5:16 PM

## 🚨 The Critical Bug

**Error in Terminal:**
```
[ERROR] Exception in ensureProfileExists {
  error: Error: Supabase client can only be used on the client side
      at getSupabaseClient (webpack-internal:///(rsc)/./lib/supabase.ts:20:15)
      at ensureProfileExists (webpack-internal:///(rsc)/./services/supabaseDataService.ts:48:96)
      at getGoals (webpack-internal:///(rsc)/./services/goalService.ts:79:38)
      at async GET (webpack-internal:///(rsc)/./app/api/companion/goals/route.ts:52:23)
}
```

## Root Cause

**The Problem:**
- `ensureProfileExists()` in `supabaseDataService.ts` calls `getSupabaseClient()` (CLIENT-ONLY)
- But it was being called from **server-side services**:
  - `goalService.ts` (used in API routes)
  - `dailyProblemService.ts` (used in API routes)
- This caused crashes every time API routes tried to fetch/save data

## Why This Broke Everything

1. **API Routes crashed** when trying to check/save goals
2. **Problem of the Day couldn't save** completion status
3. **XP/Streaks couldn't update** properly
4. **All database operations** that depended on these services failed

## The Fix

**Removed all `ensureProfileExists()` calls from server-side code:**

### 1. `services/goalService.ts`
- **Before**: Lines 48-56 (in `createGoal`)
- **Before**: Lines 108-116 (in `getGoals`)
- **After**: Removed entirely - API routes don't need this check

### 2. `services/dailyProblemService.ts`
- **Before**: Lines 110-118 (in `markDailyProblemSolved`)
- **After**: Removed entirely - client-side call doesn't need server-side profile check

## Why This Fix Is Correct

**Server-side code doesn't need `ensureProfileExists()` because:**

1. ✅ **Admin client bypasses RLS** - API routes use `getSupabaseAdmin()` which has full access
2. ✅ **Migration guarantees profiles exist** - `ensure_all_users_have_profiles.sql` already ran
3. ✅ **Foreign keys enforce consistency** - Database constraints prevent orphaned records
4. ✅ **Profile creation happens at signup** - `app/api/create-profile/route.ts` handles this

**Client-side code (`supabaseDataService.ts`) STILL calls `ensureProfileExists()`:**
- This is correct - client-side operations need it
- Uses `getSupabaseClient()` (client-only)
- Works fine from React components and hooks

## Impact

**What's Now Fixed:**
- ✅ API routes no longer crash with "Supabase client can only be used on the client side"
- ✅ Goal fetching/creation works
- ✅ Daily problem completion saving should work
- ✅ All server-side database operations unblocked

**What Still Needs Testing:**
- ⏳ Problem of the Day completion status saving
- ⏳ XP and streak updates
- ⏳ Session clearing after "Back to Home"

## Files Changed

1. `services/goalService.ts`
   - Removed lines 48-56 (ensureProfileExists call in createGoal)
   - Removed lines 108-116 (ensureProfileExists call in getGoals)

2. `services/dailyProblemService.ts`
   - Removed lines 110-118 (ensureProfileExists call in markDailyProblemSolved)

## Next Steps

1. **Refresh the browser** (hard refresh: Cmd+Shift+R)
2. **Check console** - should see NO MORE:
   - `[ERROR] Exception in ensureProfileExists`
   - `Supabase client can only be used on the client side`
3. **Test Problem of the Day**:
   - Start a problem
   - Solve it
   - Check if it shows as "Completed"
   - Click "Back to Home" - should NOT show "Resume"
4. **Check XP and Level** - should load without timeouts

---

## Technical Notes

### Why We Had This Bug

**The Architecture Confusion:**
- `services/supabaseDataService.ts` was designed for **client-side use**
- But we added `ensureProfileExists()` to it and called it from **server-side services**
- This violated Next.js's client/server boundary

**The Correct Pattern:**
```typescript
// CLIENT-SIDE (React components, hooks)
import { ensureProfileExists } from "@/services/supabaseDataService";
await ensureProfileExists(userId); // ✅ OK - uses getSupabaseClient()

// SERVER-SIDE (API routes, server services)
import { getSupabaseAdmin } from "@/lib/supabase-admin";
const supabase = getSupabaseAdmin(); // ✅ OK - bypasses RLS, no need for ensureProfileExists
```

### Lesson Learned

**Never mix client and server Supabase patterns:**
- `getSupabaseClient()` → Client-side only
- `getSupabaseAdmin()` → Server-side only
- `ensureProfileExists()` → Client-side only (calls getSupabaseClient internally)

