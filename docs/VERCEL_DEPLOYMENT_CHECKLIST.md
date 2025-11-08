# Vercel Deployment Checklist

## ✅ **Pre-Deployment Checklist**

### 1. **Environment Variables**

Make sure these are set in Vercel:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://kxdinqtwnkmublxpqhhl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# App Settings
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

**How to set in Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add each variable for **Production**, **Preview**, and **Development**
3. Click **Save**

---

### 2. **Database Migrations Applied**

All critical migrations should be applied to Supabase:

- ✅ `fix_rls_for_student_profiles_final.sql` - RLS policies for xp_data and streaks
- ✅ `fix_xp_data_rls_only.sql` - XP data RLS policies
- ✅ `cleanup_student_profiles_rls.sql` - Student profiles RLS cleanup
- ✅ `fix_streaks_composite_unique_constraint.sql` - Streaks unique constraint
- ✅ `fix_xp_data_composite_unique_constraint.sql` - XP data unique constraint

**To verify migrations:**
```sql
-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('xp_data', 'streaks', 'student_profiles')
ORDER BY tablename, cmd;

-- Check unique constraints
SELECT 
  con.conname AS constraint_name,
  rel.relname AS table_name
FROM pg_constraint con
JOIN pg_class rel ON con.conrelid = rel.oid
WHERE rel.relname IN ('xp_data', 'streaks')
  AND con.contype = 'u';
```

---

### 3. **Code Ready for Deployment**

#### Files Created/Modified:

**New Services:**
- ✅ `services/dailyLoginService.ts` - Daily login XP rewards
- ✅ `services/rankingService.ts` - Ranking system
- ✅ `services/leaderboardService.ts` - Real leaderboard from DB

**Modified Services:**
- ✅ `services/supabaseDataService.ts` - Fixed NULL user_id, race conditions
- ✅ `contexts/AuthContext.tsx` - Daily login integration
- ✅ `components/unified/XPContent.tsx` - Polished UI with ranks
- ✅ `app/api/referral/award-rewards/route.ts` - Fixed student_profile_id queries

**Documentation:**
- ✅ `docs/XP_SYSTEM_IMPLEMENTATION.md`
- ✅ `docs/RANKING_SYSTEM.md`
- ✅ `docs/XP_DESIGN_POLISH.md`
- ✅ `docs/XP_STREAK_NULL_USER_ID_FIX.md`

---

### 4. **Build Test Locally**

Run this to ensure the app builds successfully:

```bash
npm run build
```

**Common build errors to check:**
- ❌ Missing environment variables
- ❌ TypeScript errors
- ❌ Import errors
- ❌ Linting errors

If build passes locally, it should pass on Vercel!

---

## 🚀 **Deployment Steps**

### Option 1: Deploy via GitHub (Recommended)

1. **Commit all changes:**
```bash
git add .
git commit -m "feat: implement XP system with daily login, ranking, and fixed RLS"
git push origin main
```

2. **Vercel auto-deploys** from GitHub
   - Watch the deployment in Vercel dashboard
   - Check build logs for errors

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI (if not already)
npm i -g vercel

# Deploy
vercel --prod
```

---

## 📊 **Database Schema Summary**

### Core Tables Used:

#### 1. **xp_data**
```sql
- user_id (UUID, NOT NULL) - Auth user ID
- student_profile_id (UUID, NULL) - Optional profile link
- total_xp (INT) - Total XP
- level (INT) - Current level
- xp_to_next_level (INT) - XP needed
- xp_history (JSONB) - History array
```

**RLS Policies:**
- Users can INSERT/SELECT/UPDATE their own XP
- Service role has full access

**Unique Constraints:**
- `(user_id, student_profile_id)` composite unique

#### 2. **streaks**
```sql
- user_id (UUID, NOT NULL) - Auth user ID
- student_profile_id (UUID, NULL) - Optional profile link
- current_streak (INT) - Current days
- longest_streak (INT) - Best streak
- last_study_date (DATE) - Last activity
```

**RLS Policies:**
- Same as xp_data

**Unique Constraints:**
- `(user_id, student_profile_id)` composite unique

#### 3. **profiles**
```sql
- id (UUID, PK) - Same as auth.users.id
- username (TEXT) - Display name
- role (TEXT) - student/parent/teacher/admin
```

**RLS Policies:**
- Users can view/update their own profile

#### 4. **student_profiles**
```sql
- id (UUID, PK)
- owner_id (UUID) - Parent/teacher who created
- name (TEXT) - Student name
- grade_level (INT) - Grade
```

**RLS Policies:**
- Users can create/view/update profiles they own

---

## 🧪 **Post-Deployment Testing**

### 1. **Sign Up Flow**
- [ ] New user can sign up
- [ ] Receives **+60 XP** (50 first login + 10 daily)
- [ ] Shows **Level 1, Novice (I)** rank
- [ ] No console errors

### 2. **Daily Login**
- [ ] Login next day → receives **+10 XP**
- [ ] Login same day → no duplicate XP
- [ ] Console logs show correct messages

### 3. **XP Display**
- [ ] Shows rank badge (Roman numeral)
- [ ] Shows rank title (colored)
- [ ] Progress bar animates smoothly
- [ ] Stats cards display correctly
- [ ] Recent activity shows XP gains

### 4. **Problem Solving**
- [ ] Solve a problem → gain XP
- [ ] XP updates in database
- [ ] Level increases when threshold reached
- [ ] Rank changes when crossing threshold

### 5. **Referrals**
- [ ] User A creates referral code
- [ ] User B signs up with code
- [ ] User A gets +200 XP
- [ ] User B gets +100 XP
- [ ] No HTTP 406/403 errors

### 6. **Database Queries**
Run these to verify data:

```sql
-- Check XP data is being created correctly
SELECT 
  user_id,
  student_profile_id,
  total_xp,
  level,
  created_at
FROM xp_data
ORDER BY created_at DESC
LIMIT 10;

-- Check streaks
SELECT 
  user_id,
  student_profile_id,
  current_streak,
  longest_streak,
  last_study_date
FROM streaks
ORDER BY created_at DESC
LIMIT 10;

-- Verify no NULL user_id violations
SELECT COUNT(*) as null_user_ids
FROM xp_data
WHERE user_id IS NULL;
-- Should return 0

SELECT COUNT(*) as null_user_ids
FROM streaks
WHERE user_id IS NULL;
-- Should return 0
```

---

## ⚠️ **Common Issues & Solutions**

### Issue 1: Build Fails on Vercel
**Error:** `Module not found: Can't resolve '@/services/...'`

**Solution:**
- Check `tsconfig.json` has correct paths
- Verify all imports use `@/` prefix consistently
- Run `npm run build` locally first

### Issue 2: Environment Variables Not Working
**Error:** `Supabase client not configured`

**Solution:**
- Re-check Vercel environment variables
- Ensure they're set for **Production** environment
- Redeploy after adding variables

### Issue 3: RLS Policy Blocking Inserts
**Error:** `new row violates row-level security policy`

**Solution:**
- Verify migrations are applied to Supabase
- Check RLS policies with query from section 2
- Ensure `user_id` is always set in inserts

### Issue 4: 406 Errors on XP Queries
**Error:** `HTTP 406 - The result contains 0 rows`

**Solution:**
- Check query includes `student_profile_id IS NULL` for personal XP
- Verify composite unique constraint exists
- Check RLS policies allow SELECT

---

## 📈 **Performance Optimizations**

### Already Implemented:
- ✅ Composite indexes on `(user_id, student_profile_id)`
- ✅ RLS policies optimized
- ✅ Client-side caching with localStorage
- ✅ Efficient database queries (minimal joins)

### Recommended for Production:
- [ ] Add database connection pooling
- [ ] Enable Supabase read replicas (if on Pro plan)
- [ ] Add Redis caching for leaderboard
- [ ] Implement ISR (Incremental Static Regeneration) for static pages

---

## 🔒 **Security Checklist**

- ✅ RLS policies enabled on all tables
- ✅ Service role key only used server-side
- ✅ User data properly isolated
- ✅ No SQL injection vulnerabilities
- ✅ API routes validate authentication
- ✅ Environment variables secured

---

## 📝 **Deployment Commands**

```bash
# 1. Final check
npm run lint
npm run build

# 2. Commit changes
git add .
git commit -m "feat: complete XP system with daily login and ranking"
git push origin main

# 3. Watch Vercel deployment
# Go to: https://vercel.com/your-project/deployments

# 4. Test production
# Visit: https://your-app.vercel.app
```

---

## ✅ **Final Checklist**

Before going live:

- [ ] All environment variables set in Vercel
- [ ] All migrations applied to Supabase
- [ ] Local build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code committed to GitHub
- [ ] Vercel deployment successful
- [ ] Post-deployment tests pass
- [ ] Error monitoring configured (Vercel Analytics)

---

**Status:** 🟢 READY FOR DEPLOYMENT
**Date:** 2025-11-08
**Version:** Production v1.0

**Deploy Command:**
```bash
git push origin main
```

🚀 **Let's ship it!**

