# Database Sync Explanation - History & Bookmarks

## Database Schema: `problems` Table

The `problems` table stores all problem history and bookmarks. Here's the complete schema:

```sql
CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  
  -- Problem Data
  text TEXT NOT NULL,                    -- The problem text/question
  type TEXT NOT NULL,                    -- Problem type (ARITHMETIC, ALGEBRA, GEOMETRY, etc.)
  difficulty TEXT,                       -- Difficulty level (elementary, middle school, etc.)
  image_url TEXT,                        -- URL to problem image (if any)
  parsed_data JSONB,                    -- Full parsed problem object (for reconstruction)
  
  -- Metadata
  is_bookmarked BOOLEAN DEFAULT false,   -- Is this problem bookmarked?
  is_generated BOOLEAN DEFAULT false,    -- Was this problem AI-generated?
  source TEXT,                           -- Source: "user_input", "upload", "generated", etc.
  
  -- Completion Stats
  solved_at TIMESTAMPTZ,                 -- When the problem was solved
  attempts INTEGER DEFAULT 0,            -- Number of attempts
  hints_used INTEGER DEFAULT 0,          -- Number of hints used
  time_spent INTEGER DEFAULT 0,         -- Time spent in seconds
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_problems_user_id ON problems(user_id);
CREATE INDEX idx_problems_profile_id ON problems(student_profile_id);
CREATE INDEX idx_problems_solved_at ON problems(solved_at DESC);
CREATE INDEX idx_problems_bookmarked ON problems(is_bookmarked) WHERE is_bookmarked = true;
```

## What Data Syncs from Database?

When you're **ONLINE**, the following data syncs from the database:

### 1. **Problem History** (All solved problems)
- `id` - Unique problem ID
- `text` - Problem text/question
- `type` - Problem type (ARITHMETIC, ALGEBRA, etc.)
- `difficulty` - Difficulty level
- `imageUrl` - Problem image URL (if any)
- `savedAt` - When problem was solved (from `solved_at`)
- `isBookmarked` - Is it bookmarked?
- `hintsUsed` - Number of hints used
- `exchanges` - Number of message exchanges (from `parsed_data`)
- `difficulty` - Problem difficulty (from `parsed_data` or `difficulty` column)

### 2. **Bookmarks** (Filtered from problems)
- Same data as above, but filtered where `is_bookmarked = true`

### 3. **Profile-Specific Data**
- If you have an active student profile, only problems for that profile sync
- If no profile, only user-level problems sync
- This ensures parents/teachers see the right data for each student

## How Online Sync Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER OPENS APP                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  STEP 1: OFFLINE (Instant)    │
        │  - Load from localStorage     │
        │  - Show cached data immediately│
        │  - No loading spinner          │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  STEP 2: ONLINE (Background)  │
        │  - Query database             │
        │  - Filter by user_id          │
        │  - Filter by profile_id       │
        │  - Order by created_at DESC   │
        │  - Limit 100 most recent      │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  STEP 3: UPDATE UI            │
        │  - Replace cached data        │
        │  - Update localStorage cache  │
        │  - Show latest from database  │
        └───────────────────────────────┘
```

### Detailed Sync Process

#### 1. **Initial Load (Component Mount)**

```typescript
// STEP 1: Show cached data immediately (OFFLINE)
const cachedData = localStorage.getItem("aitutor-problem-history");
setProblems(cachedData);  // Instant UI, no loading

// STEP 2: Sync from database (ONLINE)
const dbProblems = await getProblems(userId, 100, profileId);
setProblems(dbProblems);  // Update with latest from database
localStorage.setItem("aitutor-problem-history", JSON.stringify(dbProblems));
```

#### 2. **Database Query**

```typescript
// Query filters:
- user_id = current user ID
- student_profile_id = active profile ID (or NULL for user-level)
- ORDER BY created_at DESC (newest first)
- LIMIT 100 (most recent 100 problems)
```

#### 3. **Data Transformation**

Database format → UI format:

```typescript
{
  // Database columns
  id: "uuid-123",
  text: "Solve 2x + 5 = 15",
  type: "ALGEBRA",
  solved_at: "2025-01-08T10:30:00Z",
  is_bookmarked: true,
  hints_used: 2,
  parsed_data: { ... },
  
  // Transformed to UI format
  id: "uuid-123",
  text: "Solve 2x + 5 = 15",
  type: "ALGEBRA",
  savedAt: 1704712200000,  // Timestamp
  isBookmarked: true,
  hintsUsed: 2,
  exchanges: 5,  // From parsed_data
  difficulty: "middle school"  // From parsed_data or column
}
```

## What Happens When You...

### Add a Problem
1. **UI updates immediately** (optimistic update)
2. **Saves to database** (background)
3. **Updates localStorage cache** (for offline)

### Bookmark/Unbookmark
1. **UI updates immediately** (optimistic update)
2. **Updates database** (`is_bookmarked` column)
3. **Updates localStorage cache**

### Delete a Problem
1. **UI updates immediately** (optimistic update)
2. **Deletes from database**
3. **Updates localStorage cache**

### Switch Devices
1. **Device A**: Problem saved → Database ✅
2. **Device B**: Opens app → Loads from database → Sees Device A's problem ✅
3. **Both devices**: Same data (synced via database) ✅

### Go Offline
1. **Shows cached data** (from localStorage)
2. **Can still view** history/bookmarks
3. **When back online**: Syncs from database automatically

## Data Persistence Guarantees

✅ **Persists across:**
- Browser refreshes (Command+R, Command+Shift+R)
- Device switches (phone → laptop)
- Browser clears (localStorage cleared, but database remains)
- Account switches (each user has their own data)
- Profile switches (each profile has separate data)

❌ **Does NOT persist:**
- Guest mode (localStorage only, cleared when browser data cleared)
- If database is deleted (but that's server-side, not user action)

## Summary

**Database = Source of Truth**
- All logged-in user data is stored in Supabase
- Works across all devices
- Survives browser clears
- Profile-specific data isolation

**localStorage = Performance Cache**
- Instant UI (no loading spinner)
- Offline support
- Device-specific (can be cleared)
- Automatically synced from database

**Best Practice:**
- Database for persistence ✅
- localStorage for performance ✅
- Both work together seamlessly ✅

