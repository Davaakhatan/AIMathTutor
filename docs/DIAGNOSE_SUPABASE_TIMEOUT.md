# Diagnosing Supabase Timeout Issues

## Symptoms
- ALL Supabase queries timeout (SELECT, INSERT, RPC)
- Even server-side queries with service role key timeout
- Auth works (TOKEN_REFRESHED events), but database queries fail

## Possible Causes

### 1. Supabase Project Status
- **Check**: Go to Supabase Dashboard → Your Project
- **Look for**: Project paused, suspended, or over quota
- **Fix**: Resume project or upgrade plan

### 2. Environment Variables
- **Check**: `.env.local` file
- **Required**:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```
- **Fix**: Copy from Supabase Dashboard → Settings → API

### 3. Network/Firewall
- **Check**: Can you access Supabase Dashboard?
- **Test**: Try `curl https://your-project.supabase.co/rest/v1/` (should return 401)
- **Fix**: Check firewall, VPN, or proxy settings

### 4. Database Connection Pool
- **Check**: Supabase Dashboard → Database → Connection Pooling
- **Issue**: Too many connections
- **Fix**: Close idle connections or increase pool size

### 5. RLS Policies Blocking
- **Check**: Supabase Dashboard → Authentication → Policies
- **Issue**: Policies might be blocking even service role
- **Fix**: Temporarily disable RLS to test

## Quick Test

Run this in Supabase SQL Editor:
```sql
-- Test basic connectivity
SELECT NOW();

-- Test if user exists
SELECT id, email FROM auth.users WHERE id = 'f372c3dc-9a8a-44a8-a9bf-c2104135309b';

-- Test if profile exists
SELECT * FROM profiles WHERE id = 'f372c3dc-9a8a-44a8-a9bf-c2104135309b';

-- Test direct insert (with RLS disabled temporarily)
ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY;
INSERT INTO student_profiles (id, owner_id, name, difficulty_preference, timezone, language, settings, is_active)
VALUES (gen_random_uuid(), 'f372c3dc-9a8a-44a8-a9bf-c2104135309b', 'Test', 'middle', 'UTC', 'en', '{}', true);
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
```

## Next Steps

1. Check server logs when creating profile
2. Check browser Network tab for `/api/create-profile` request
3. Verify environment variables are loaded (restart dev server)
4. Check Supabase project status in dashboard

