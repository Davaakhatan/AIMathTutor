# Comprehensive Fix Plan for Offline/Online Sync

## Critical Issues Identified

### 1. Foreign Key Schema Mismatch
**Problem**: Database tables reference `public.profiles(id)`, but code uses `auth.users(id)`

**Affected Tables** (from actual schema):
- `problems` → `user_id UUID REFERENCES public.profiles(id)`
- `achievements` → `user_id UUID REFERENCES public.profiles(id)`
- `daily_goals` → `user_id UUID REFERENCES public.profiles(id)`
- `streaks` → `user_id UUID REFERENCES public.profiles(id)`
- `study_sessions` → `user_id UUID REFERENCES public.profiles(id)`
- `xp_data` → `user_id UUID REFERENCES public.profiles(id)`

**Solution**: 
- `profiles.id` = `auth.users.id` (1:1 mapping)
- Ensure `profiles` row exists before all queries
- Add helper function: `ensureProfileExists(userId)`

### 2. Wrong Offline/Online Sync Pattern

**Current (WRONG)**:
```typescript
// ❌ Loads localStorage first, then overwrites with database
1. Load localStorage → Show UI immediately
2. Sync database in background
3. Overwrite localStorage with database data
// Problem: User changes during sync are LOST!
```

**Correct Pattern**:
```typescript
// ✅ Database-first with optimistic updates
1. Load database → Cache to localStorage → Show UI
2. Writes: Optimistic update → Save to database → Update cache
3. On error: Revert optimistic update
```

### 3. No Conflict Resolution

**Problem**: What if localStorage has newer data than database?

**Solution**: Timestamp-based conflict resolution
- Compare `updated_at` timestamps
- Database wins on tie (source of truth)
- If localStorage is newer, save to database first

### 4. Race Conditions

**Problem**: Multiple syncs happening simultaneously

**Solution**: 
- Use `isSyncing` flag to prevent concurrent syncs
- Queue writes when offline
- Sync queue when back online

## Implementation Steps

### Step 1: Add Profile Existence Check
```typescript
// services/supabaseDataService.ts
async function ensureProfileExists(userId: string): Promise<boolean> {
  const supabase = await getSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();
  
  if (!data) {
    // Create profile
    await supabase.from("profiles").insert({ id: userId, role: "student" });
  }
  return true;
}
```

### Step 2: Fix Sync Pattern in All Hooks

**Before** (useProblemHistory.ts):
```typescript
// ❌ WRONG: localStorage first
const cachedData = localStorage.getItem("cache");
setData(cachedData); // Show immediately
// Then sync database in background
```

**After**:
```typescript
// ✅ CORRECT: Database first
setIsLoading(true);
const dbData = await getDataFromDatabase();
setData(dbData);
localStorage.setItem("cache", JSON.stringify(dbData)); // Cache
setIsLoading(false);
```

### Step 3: Add Conflict Resolution
```typescript
const syncWithConflictResolution = async () => {
  const cached = localStorage.getItem("cache");
  const dbData = await getDataFromDatabase();
  
  if (!cached) return dbData;
  
  const cachedTime = JSON.parse(cached).updated_at || 0;
  const dbTime = dbData.updated_at || 0;
  
  if (dbTime >= cachedTime) {
    // Database is newer or same - use database
    return dbData;
  } else {
    // Cache is newer - save to database first
    await saveToDatabase(JSON.parse(cached));
    return JSON.parse(cached);
  }
};
```

### Step 4: Add Optimistic Updates
```typescript
const saveData = async (newData) => {
  // 1. Optimistic update
  setData(newData);
  localStorage.setItem("cache", JSON.stringify(newData));
  setIsSyncing(true);
  
  try {
    // 2. Save to database
    await saveToDatabase(newData);
    setIsSyncing(false);
  } catch (error) {
    // 3. Revert on error
    const previous = await getDataFromDatabase();
    setData(previous);
    localStorage.setItem("cache", JSON.stringify(previous));
    setIsSyncing(false);
    showError("Failed to save");
  }
};
```

## Files to Update

1. ✅ `services/supabaseDataService.ts` - Add `ensureProfileExists()`
2. ✅ `hooks/useProblemHistory.ts` - Database-first pattern
3. ✅ `hooks/useXPData.ts` - Database-first pattern
4. ✅ `hooks/useStreakData.ts` - Database-first pattern
5. ✅ `hooks/useDailyGoals.ts` - Database-first pattern
6. ✅ `hooks/useStudySessions.ts` - Database-first pattern
7. ✅ `hooks/useChallengeHistory.ts` - Database-first pattern

## Testing Checklist

- [ ] Test offline mode (no database access)
- [ ] Test online mode (database access)
- [ ] Test offline → online transition
- [ ] Test concurrent writes
- [ ] Test conflict resolution
- [ ] Test profile existence check
- [ ] Test error handling and revert

