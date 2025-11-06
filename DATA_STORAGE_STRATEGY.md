# Data Storage Strategy: localStorage vs Supabase

## Current Situation

The app currently uses **localStorage** for all data (XP, streaks, problems, etc.), regardless of whether the user is authenticated or not.

## Best Practice Solution

### For Guests (Not Logged In)
- ✅ **Use localStorage only** (temporary, device-specific)
- ✅ Fast, no network calls
- ✅ Works offline
- ⚠️ Data lost if browser cleared
- ⚠️ Not synced across devices

### For Authenticated Users (Logged In)
- ✅ **Use Supabase database** (persistent, cloud-synced)
- ✅ Data persists across devices
- ✅ Never lost (unless account deleted)
- ✅ Can access from any device
- ⚠️ Requires network (but can cache locally)

## Recommended Hybrid Approach

### Strategy: "Supabase as Source of Truth, localStorage as Cache"

1. **On Login:**
   - Load data from Supabase
   - Merge with localStorage (if any)
   - Save merged data to Supabase
   - Cache in localStorage for offline access

2. **During Use:**
   - Write to both Supabase AND localStorage
   - localStorage = fast cache
   - Supabase = persistent storage

3. **On Logout:**
   - Keep localStorage (for guest mode)
   - Clear user-specific data from localStorage

4. **On Guest Mode:**
   - Use localStorage only
   - No Supabase calls

## Implementation Plan

### Phase 1: Create Data Sync Service
```typescript
// services/dataSync.ts
- syncXPData(userId, localData) → Supabase
- syncStreakData(userId, localData) → Supabase
- syncProblems(userId, localData) → Supabase
- loadUserData(userId) → from Supabase
```

### Phase 2: Update Components
- Check if user is authenticated
- If yes: Use Supabase + localStorage cache
- If no: Use localStorage only

### Phase 3: Migration on Login
- On first login: Migrate localStorage → Supabase
- Show migration progress
- Clear old localStorage data after migration

## Benefits

✅ **Guests**: Fast, no signup required
✅ **Users**: Persistent, cross-device sync
✅ **Offline**: localStorage cache works offline
✅ **Performance**: localStorage for instant updates, Supabase for persistence
✅ **Migration**: Smooth transition from guest to user

## Data to Sync

### High Priority (Sync Immediately)
- XP data (`xp_data` table)
- Streaks (`streaks` table)
- Problems (`problems` table)
- Study sessions (`study_sessions` table)

### Medium Priority (Sync Periodically)
- Settings (`profiles.settings`)
- Bookmarks (`problems` with `is_bookmarked`)
- Daily goals (`daily_goals` table)

### Low Priority (Cache Only)
- UI state (open/closed panels)
- Temporary preferences

## Migration Strategy

### On First Login:
1. Check if user has data in Supabase
2. If no: Migrate localStorage → Supabase
3. If yes: Load from Supabase, merge with localStorage
4. Show toast: "Your progress has been saved!"

### On Subsequent Logins:
1. Load from Supabase
2. Update localStorage cache
3. Continue using both

## Code Structure

```
services/
  dataSync.ts          # Main sync service
  supabaseData.ts      # Supabase data operations
  localStorageData.ts  # localStorage operations
  migration.ts         # Migration logic

hooks/
  useUserData.ts       # Hook that handles auth + data
  useXPData.ts         # XP data with auto-sync
  useStreakData.ts     # Streak data with auto-sync
```

## Example Usage

```typescript
// Before (localStorage only)
const [xpData, setXPData] = useLocalStorage("aitutor-xp", {});

// After (with sync)
const { xpData, setXPData, loading } = useXPData();
// Automatically syncs to Supabase if user is logged in
// Falls back to localStorage if guest
```

---

**Next Steps:**
1. Create data sync service
2. Update hooks to use sync service
3. Add migration on login
4. Test with real user account

