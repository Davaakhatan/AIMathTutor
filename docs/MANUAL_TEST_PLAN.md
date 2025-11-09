# Manual Testing Plan
## Step-by-Step Validation

**Date**: November 9, 2025  
**Duration**: ~30 minutes  
**Goal**: Validate XP, Streak, and all systems work end-to-end

---

## ✅ Pre-Test Checklist

- [x] Database schema complete (35 tables)
- [x] All user data cleared (fresh start)
- [x] Browser localStorage cleared
- [x] Dev server running (localhost:3002)
- [x] Code fixes committed

---

## Test 1: New User Signup & First Login Bonus

### Steps:
1. **Open** `http://localhost:3002` in **incognito/private** window
2. **Click** "Sign Up"
3. **Enter**: 
   - Email: `test1@test.com`
   - Password: `password123`
   - Click "Sign Up as Student"

### Expected Results:
✅ User created successfully  
✅ Redirected to main app  
✅ Console shows:
```
[INFO] User signed in { userId: "..." }
[INFO] Loading profiles on SIGNED_IN event
[INFO] Loading XP from database
[INFO] No XP data found, creating default
[INFO] XP data inserted successfully
[INFO] Awarding first login bonus XP { xp: 60 }
[INFO] XP data updated successfully
```

✅ **NO duplicate key errors**  
✅ **NO timeout errors**  
✅ Gamification Hub shows: **60 XP, Level 1**

### Check Database:
```sql
SELECT * FROM xp_data WHERE user_id = (SELECT id FROM profiles WHERE username LIKE 'test1%');
```

**Expected**: 1 row, total_xp = 60, xp_history shows first login bonus

---

## Test 2: Daily Login (Same Day)

### Steps:
1. **Logout** (click profile → logout)
2. **Login** again with same credentials
3. **Watch console**

### Expected Results:
✅ Console shows:
```
[DEBUG] Daily login XP already awarded today (found in history)
```

✅ XP remains **60** (not 120!)  
✅ No duplicate XP records in database  
✅ No errors in console

---

## Test 3: Problem Completion & XP Increase

### Steps:
1. **Click** "Problem of the Day" → "Start Challenge"
2. **Solve** the problem completely
3. **Watch console** and XP display

### Expected Results:
✅ Problem loads  
✅ Chat works (AI responds)  
✅ When solved, console shows:
```
[INFO] Problem completion detected
```

⚠️ **XP should increase** (currently disabled - orchestrator not active)  
⚠️ **Streak should increment** (currently disabled - orchestrator not active)

**Note**: These won't work yet because orchestrator is disabled. We'll enable it in Phase 2.

---

## Test 4: Multi-User Isolation

### Steps:
1. **Logout** from test1@test.com
2. **Sign up** as `test2@test.com`
3. **Check** XP (should be 60, not test1's XP)
4. **Logout**, **login** as test1@test.com
5. **Check** XP (should still be 60)

### Expected Results:
✅ Each user has separate XP  
✅ test1: 60 XP  
✅ test2: 60 XP  
✅ No cross-contamination  
✅ Database has 2 XP records (one per user)

---

## Test 5: Profile Switching (Parents/Teachers)

### Steps:
1. **Logout** from all
2. **Sign up** as `parent@test.com` (role: Parent)
3. **Create** 2 student profiles (Kid1, Kid2)
4. **Switch** between profiles
5. **Check** XP for each

### Expected Results:
✅ Each profile has separate XP  
✅ Parent sees all profiles  
✅ Can switch without errors  
✅ Database has 1 parent XP + 2 student profile XPs = 3 records

---

## Test 6: Concurrent Actions (Race Condition)

### Steps:
1. **Login** as test1@test.com
2. **Open** DevTools console
3. **Run** this in console:
```javascript
// Trigger 5 XP updates at once
Promise.all([
  fetch('/api/test/xp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId: 'your-user-id-here', xp: 100, action: 'update'})
  }),
  fetch('/api/test/xp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId: 'your-user-id-here', xp: 110, action: 'update'})
  }),
  fetch('/api/test/xp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId: 'your-user-id-here', xp: 120, action: 'update'})
  }),
  fetch('/api/test/xp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId: 'your-user-id-here', xp: 130, action: 'update'})
  }),
  fetch('/api/test/xp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId: 'your-user-id-here', xp: 140, action: 'update'})
  }),
]).then(() => console.log('All requests complete'));
```

### Expected Results:
✅ All requests succeed  
✅ NO "duplicate key" errors  
✅ Database still has exactly 1 XP record  
✅ XP = 140 (last update wins)

---

## Test 7: Session Persistence

### Steps:
1. **Login** as test1@test.com
2. **Start** a problem (don't solve it)
3. **Refresh** the page (Cmd+R)
4. **Check** if problem is still there

### Expected Results:
⚠️ Session Resume is disabled, so problem will be lost  
✅ No cross-user session issues  
✅ No errors in console

---

## Test Checklist

### Database Layer ✅
- [x] 35 tables exist
- [x] No duplicate records
- [x] RLS policies work
- [x] Foreign keys intact

### API Layer (Partially Testable)
- [ ] Can create users (via Supabase Auth)
- [ ] Can create XP records
- [ ] Can update XP without duplicates
- [ ] Can create streak records
- [ ] Can update streaks

### Application Layer (Browser Testing)
- [ ] Signup works
- [ ] Login works
- [ ] First login bonus (60 XP)
- [ ] XP displays correctly
- [ ] No duplicate login bonus
- [ ] Problem input works
- [ ] Chat works
- [ ] Multi-user isolation

---

## When All Tests Pass

### Phase 1 Complete ✅
You can move to Phase 2:
- Re-enable orchestrator
- Connect problem completion → XP updates
- Enable achievements
- Enable leaderboard with real data

### Current Blockers
**None** - All fixes are in place. Just need to validate through testing.

---

## How to Report Issues

When testing, note:
1. **Which test failed**
2. **Error message** (from console)
3. **Expected vs Actual** behavior
4. **Database state** (row count, duplicate check)

Example:
```
Test 3 FAILED
Error: "duplicate key value violates unique constraint"
Expected: 1 XP record
Actual: 2 XP records
Database: SELECT * FROM xp_data shows 2 rows with same user_id
```

---

## Success Criteria

All tests pass when:
- ✅ Signup creates exactly 60 XP (once)
- ✅ Login on same day doesn't add more XP
- ✅ Multiple updates don't create duplicates
- ✅ Each user has isolated data
- ✅ No console errors
- ✅ Database stays clean

**Then**: Ready for Phase 2! 🚀

---

**Start testing in browser now!**

Use incognito window, signup, and validate the flow manually.

