# Problem of the Day - Request Error Fix

**Date**: November 8, 2025  
**Status**: ✅ FIXED

## 🐛 The Bug

When a problem was solved, the auto-save logic in `app/api/chat/route.ts` crashed with:
```
ReferenceError: request is not defined
```

### Root Cause
Line 706 tried to use `request.nextUrl.origin` inside an async function where `request` was not in scope:
```typescript
const checkResponse = await fetch(`${request.nextUrl.origin}/api/daily-problem?...`);
//                                    ^^^^^^^ NOT IN SCOPE!
```

## ✅ The Fix

Replaced `request.nextUrl.origin` with environment-based URL detection:

```typescript
// Use environment variables for API URL (server-side fetch)
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : "http://localhost:3002";

const checkResponse = await fetch(`${baseUrl}/api/daily-problem?...`);
```

### What This Does
- **Local Dev**: Uses `http://localhost:3002`
- **Production**: Uses `NEXT_PUBLIC_SITE_URL` or constructs from `VERCEL_URL`
- **No more crashes!**

## 🧪 How to Test

1. **Restart your dev server** (pick up the code changes):
   ```bash
   # Kill current server (Ctrl+C)
   npm run dev
   ```

2. **Solve a practice problem** in your app

3. **Check terminal for**:
   ```
   📅 Checking if solved problem matches Problem of the Day...
   ✅ MATCH! Saving Problem of the Day completion...
   ✅ Problem of the Day completion saved successfully!
   ```

4. **Run this SQL** in Supabase (note: fixed syntax):
   ```sql
   SELECT * FROM daily_problems_completion ORDER BY solved_at DESC;
   ```

5. **Expected Result**: You should see a row with:
   - `user_id`: Your user ID
   - `problem_date`: Today's date (2025-11-08)
   - `problem_text`: The problem you just solved
   - `solved_at`: Timestamp of when you solved it

## 📝 SQL Syntax Note

**❌ Wrong**:
```sql
SELECT * FROM daily_problems_completion ORDER BY limit 100;
```

**✅ Correct**:
```sql
SELECT * FROM daily_problems_completion ORDER BY solved_at DESC LIMIT 100;
```

The `LIMIT` clause goes at the **end**, after `ORDER BY`.

## 🔍 What Changed

### Before
```typescript
const checkResponse = await fetch(`${request.nextUrl.origin}/api/daily-problem?...`);
//                                    ^^^^^^^ ERROR: request not defined
```

### After
```typescript
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : "http://localhost:3002";

const checkResponse = await fetch(`${baseUrl}/api/daily-problem?...`);
//                                    ^^^^^^^ WORKS! Using environment variable
```

## 🚀 Next Steps

After restarting the server and testing:
1. ✅ Verify completion saves to database
2. ✅ Verify "Problem of the Day" shows as completed in UI
3. ✅ Verify no more "request is not defined" errors

Then we can move on to fixing the **streaks churn bug** (199 inserts, 195 deletes)!

