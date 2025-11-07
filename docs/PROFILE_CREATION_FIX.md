# Profile Creation Fix Guide

## The Problem
Profile creation is timing out because the INSERT operation is being blocked by RLS (Row Level Security) policies.

## The Solution

### Step 1: Run the Diagnostic Migration
Run this in Supabase SQL Editor to see what's wrong:
```sql
-- Run: supabase/migrations/diagnose_profile_creation.sql
```

This will show you:
- If RLS is enabled
- What INSERT policies exist
- If there are conflicts
- If helper functions are missing

### Step 2: Run the Fix Migration
Run this in Supabase SQL Editor to fix all issues:
```sql
-- Run: supabase/migrations/fix_all_profile_creation_issues.sql
```

This migration will:
- ✅ Create helper functions to prevent RLS recursion
- ✅ Drop all conflicting policies
- ✅ Create clean, non-recursive INSERT policy
- ✅ Fix foreign key constraints
- ✅ Ensure RLS is properly configured

### Step 3: Verify the Fix
After running the migration, check the console logs when creating a profile. You should see:
1. "Inserting profile..."
2. "Generated profile ID: [uuid]"
3. "Insert data prepared: {...}"
4. "About to execute INSERT"
5. "Insert completed in X ms"

If you still see a timeout, the INSERT is still being blocked. Check:
- Did the migration run successfully?
- Are there any errors in Supabase logs?
- Is the user authenticated?

## What Changed in the Code

1. **Removed `.select()` from INSERT** - This was causing RLS recursion
2. **Added timeout to INSERT** - Now fails fast (8 seconds) instead of hanging
3. **Client-generated UUID** - Avoids needing to fetch the ID back
4. **Better error messages** - Tells you exactly what's wrong

## If It Still Doesn't Work

1. Check Supabase logs for RLS policy errors
2. Verify the user is authenticated (`auth.uid()` is not null)
3. Check if the `profiles` table has the user's record
4. Verify the user's role is set correctly in the `profiles` table

