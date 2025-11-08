# Database Schema Issues & Fixes

## Critical Issues Found

### 1. Foreign Key Mismatch

**Problem**: Actual database schema uses `public.profiles(id)` but our migrations use `auth.users(id)`

**Tables Affected**:
- `problems` → references `public.profiles(id)` ❌
- `achievements` → references `public.profiles(id)` ❌
- `daily_goals` → references `public.profiles(id)` ❌
- `streaks` → references `public.profiles(id)` ❌
- `study_sessions` → references `public.profiles(id)` ❌
- `xp_data` → references `public.profiles(id)` ❌

**Tables Correct**:
- `challenges` → references `auth.users(id)` ✅
- `conversation_summaries` → references `auth.users(id)` ✅
- `daily_problems_completion` → references `auth.users(id)` ✅
- `learning_goals` → references `auth.users(id)` ✅
- `shares` → references `auth.users(id)` ✅

**Solution**: 
- `profiles.id` = `auth.users.id` (1:1 mapping)
- But foreign keys point to `profiles.id`, not `auth.users.id`
- Our code uses `user.id` (from `auth.users`) which should work IF `profiles.id` = `auth.users.id`
- Need to ensure `profiles` row exists for every user

### 2. Offline/Online Sync Race Conditions

**Problem**: Current logic:
1. Loads from localStorage immediately
2. Syncs from database in background
3. **Overwrites localStorage with database data**

**Issues**:
- If user makes changes while sync is happening, changes might be lost
- No conflict resolution (what if localStorage has newer data?)
- No timestamp comparison
- localStorage might overwrite database data if sync fails

### 3. Missing Conflict Resolution

**Problem**: No logic to handle:
- localStorage has newer data than database
- Database has newer data than localStorage
- Both have different data (conflict)

## Best Practice Solution

### Pattern: "Database-First with Optimistic Updates"

1. **Initial Load**:
   - Show loading state briefly
   - Load from database first (source of truth)
   - Cache to localStorage
   - Then show UI

2. **Writes**:
   - Update UI immediately (optimistic)
   - Save to database
   - Update localStorage cache
   - Revert UI if database save fails

3. **Sync Strategy**:
   - Database is ALWAYS source of truth
   - localStorage is ONLY a cache
   - On conflict: Database wins
   - Use timestamps to detect conflicts

4. **Offline Support**:
   - Queue writes when offline
   - Sync queue when back online
   - Show "syncing" indicator

