# Critical Fixes Needed for Offline/Online Sync

## Issue Summary

The current implementation has **fundamental flaws** in offline/online data synchronization:

### ❌ Current Pattern (WRONG)
1. Load localStorage → Show UI immediately
2. Sync database in background
3. Overwrite localStorage with database data
4. **Problem**: User changes during sync are lost!

### ✅ Correct Pattern (Database-First)
1. Load database → Cache to localStorage → Show UI
2. Writes: Optimistic update → Save to database → Update cache
3. Conflict resolution: Timestamp comparison
4. Offline: Queue writes, sync when online

## Root Causes

1. **Foreign Key Mismatch**: Database uses `profiles.id`, code uses `auth.users.id`
   - Solution: Ensure `profiles` row exists (1:1 with `auth.users`)
   
2. **Race Conditions**: localStorage overwrites database data
   - Solution: Database is source of truth, localStorage is cache only
   
3. **No Conflict Resolution**: What if localStorage has newer data?
   - Solution: Timestamp comparison, database wins on tie

## Implementation Plan

### Phase 1: Fix Foreign Keys
- Ensure profiles row exists before all queries
- Add profile creation check in data service functions

### Phase 2: Fix Sync Pattern
- Change all hooks to "database-first"
- Add optimistic updates with revert
- Add conflict resolution

### Phase 3: Add Offline Support
- Queue writes when offline
- Sync queue when online
- Show syncing indicators

## Files to Fix

1. `hooks/useProblemHistory.ts` - Change to database-first
2. `hooks/useXPData.ts` - Change to database-first
3. `hooks/useStreakData.ts` - Change to database-first
4. `hooks/useDailyGoals.ts` - Change to database-first
5. `hooks/useStudySessions.ts` - Change to database-first
6. `services/supabaseDataService.ts` - Add profile existence check
7. All hooks - Add conflict resolution

