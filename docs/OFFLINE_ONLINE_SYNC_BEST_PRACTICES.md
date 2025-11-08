# Offline/Online Sync Best Practices

## Current Issues

### ❌ Problem 1: Race Conditions
- Loads localStorage first
- Syncs database in background
- **Overwrites localStorage with database data**
- If user makes changes during sync, they might be lost

### ❌ Problem 2: No Conflict Resolution
- What if localStorage has newer data?
- What if database has newer data?
- No timestamp comparison
- Database always wins (might lose user's recent changes)

### ❌ Problem 3: Foreign Key Mismatch
- Database uses `public.profiles(id)` 
- Code uses `auth.users(id)`
- Should work IF `profiles.id = auth.users.id` (1:1)
- But need to ensure profiles row exists

## ✅ Best Practice Solution: "Database-First with Optimistic Updates"

### Pattern Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACTION                           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  STEP 1: Optimistic Update    │
        │  - Update UI immediately      │
        │  - Update localStorage cache   │
        │  - Show "syncing" indicator    │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  STEP 2: Save to Database     │
        │  - Save to Supabase           │
        │  - Handle errors               │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  STEP 3: Sync Complete        │
        │  - Update localStorage cache   │
        │  - Hide "syncing" indicator    │
        │  - If error: Revert UI         │
        └───────────────────────────────┘
```

### Initial Load Pattern

```typescript
// ✅ CORRECT: Database-first
useEffect(() => {
  // STEP 1: Show loading state (brief)
  setIsLoading(true);
  
  // STEP 2: Load from database (source of truth)
  const loadFromDatabase = async () => {
    try {
      const dbData = await getDataFromDatabase(userId);
      
      // STEP 3: Update state with database data
      setData(dbData);
      
      // STEP 4: Cache to localStorage
      localStorage.setItem("cache-key", JSON.stringify(dbData));
      
      setIsLoading(false);
    } catch (error) {
      // STEP 5: If database fails, try localStorage (offline)
      const cachedData = localStorage.getItem("cache-key");
      if (cachedData) {
        setData(JSON.parse(cachedData));
        setIsOffline(true); // Show offline indicator
      }
      setIsLoading(false);
    }
  };
  
  loadFromDatabase();
}, [userId]);
```

### Write Pattern (Optimistic Updates)

```typescript
// ✅ CORRECT: Optimistic update with revert
const saveData = async (newData: Data) => {
  // STEP 1: Optimistic update (immediate UI)
  setData(newData);
  localStorage.setItem("cache-key", JSON.stringify(newData));
  setIsSyncing(true);
  
  try {
    // STEP 2: Save to database
    await saveToDatabase(newData);
    
    // STEP 3: Success - update cache
    localStorage.setItem("cache-key", JSON.stringify(newData));
    setIsSyncing(false);
  } catch (error) {
    // STEP 4: Error - revert to previous state
    const previousData = await getDataFromDatabase(userId);
    setData(previousData);
    localStorage.setItem("cache-key", JSON.stringify(previousData));
    setIsSyncing(false);
    showError("Failed to save. Changes reverted.");
  }
};
```

### Conflict Resolution Pattern

```typescript
// ✅ CORRECT: Timestamp-based conflict resolution
const syncWithConflictResolution = async () => {
  const cachedData = localStorage.getItem("cache-key");
  const dbData = await getDataFromDatabase(userId);
  
  if (!cachedData) {
    // No cache, use database
    return dbData;
  }
  
  const cached = JSON.parse(cachedData);
  
  // Compare timestamps
  const cachedTime = cached.updated_at || cached.created_at || 0;
  const dbTime = dbData.updated_at || dbData.created_at || 0;
  
  if (dbTime > cachedTime) {
    // Database is newer - use database
    localStorage.setItem("cache-key", JSON.stringify(dbData));
    return dbData;
  } else if (cachedTime > dbTime) {
    // Cache is newer - save to database
    await saveToDatabase(cached);
    return cached;
  } else {
    // Same timestamp - use database (source of truth)
    return dbData;
  }
};
```

## Implementation Checklist

- [ ] Change all hooks to "database-first" pattern
- [ ] Add optimistic updates with revert on error
- [ ] Add timestamp comparison for conflict resolution
- [ ] Add "syncing" indicators
- [ ] Add offline queue for writes
- [ ] Ensure profiles row exists before queries
- [ ] Add error handling and retry logic
- [ ] Test offline/online transitions

