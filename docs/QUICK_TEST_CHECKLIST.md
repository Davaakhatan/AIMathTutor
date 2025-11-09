# 🧪 QUICK TEST CHECKLIST

## Before Testing - Clean Database

**Run this SQL in Supabase first:**
```sql
-- Copy/paste from: supabase/FORCE_NULL_PROFILE_ID.sql
```

Expected result:
```json
[
  {
    "table_name": "XP Data",
    "user_level_records": X,
    "profile_level_records": 0  ← Should be 0!
  },
  {
    "table_name": "Streaks",
    "user_level_records": X,
    "profile_level_records": 0  ← Should be 0!
  }
]
```

---

## Test 1: Fresh Signup ✅

**Steps:**
1. Open incognito window
2. Go to `http://localhost:3002`
3. Click "Sign Up"
4. Fill form: `test@test.com` / `Test123!`
5. Submit

**Expected Console Logs:**
```
[DEBUG] Auth state changed { event: "SIGNED_IN" }
[DEBUG] Loading XP from database { profileId: null, userRole: "student" } ✅
[DEBUG] Loading streaks from database { profileId: null, userRole: "student" } ✅
[DEBUG] XP data inserted successfully { profileId: null } ✅
```

**Check Database:**
```sql
SELECT user_id, student_profile_id, total_xp, level FROM xp_data ORDER BY created_at DESC LIMIT 1;
```
Should show: `student_profile_id: null` ✅

---

## Test 2: Daily Login XP ✅

**Expected:**
- Should see notification: "First Login Bonus! +60 XP"
- XP display shows: 60 XP, Level 1
- Leaderboard shows your username with 60 XP

**Console Logs:**
```
[DEBUG] Daily login XP awarded { xp: 60, reason: "First Login Bonus + Daily Login" }
[DEBUG] XP data updated successfully { profileId: null } ✅
```

**Check Database:**
```sql
SELECT total_xp, xp_history FROM xp_data WHERE user_id = 'YOUR_USER_ID';
```
Should show: `total_xp: 60`, history has one entry ✅

---

## Test 3: Solve Daily Challenge ✅

**Steps:**
1. Click "Problem of the Day"
2. Click "Start Challenge"
3. Type answer: `x = 5`
4. Submit
5. Click "Back to Home"

**Expected Console Logs:**
```
[DEBUG] Problem completed { xp: 50, profileId: null } ✅
[DEBUG] XP data updated successfully { profileId: null } ✅
[DEBUG] Streak updated { profileId: null } ✅
```

**Check Database:**
```sql
SELECT total_xp, level FROM xp_data WHERE user_id = 'YOUR_USER_ID';
SELECT current_streak FROM streaks WHERE user_id = 'YOUR_USER_ID';
```
Should show: `total_xp: 110`, `level: 2`, `current_streak: 1` ✅

---

## Test 4: Page Refresh ✅

**Steps:**
1. Press `Cmd+R` (or `Ctrl+R`)
2. Wait 2 seconds

**Expected:**
- XP displays instantly (from cache)
- No loading spinner
- No duplicate queries in console
- No errors

**Console Logs Should NOT Show:**
```
❌ DUPLICATE XP RECORDS FOUND!  ← Should NOT appear!
❌ Error fetching XP data
❌ profileId: "aaed5601-..."  ← Should be null!
```

**Should Show:**
```
[DEBUG] Loading XP from database { profileId: null } ✅
[DEBUG] XP query completed { profileId: null, rowCount: 1 } ✅
```

---

## Test 5: Open Gamification Hub ✅

**Steps:**
1. Click "XP & Level" button
2. Check console

**Expected Console Logs:**
```
[DEBUG] Loading XP from database { profileId: null } ✅
[DEBUG] XP query completed { profileId: null, rowCount: 1 } ✅
```

**Should NOT Show:**
```
❌ profileId: "aaed5601-..."  ← If you see this, bug still exists!
❌ DUPLICATE XP RECORDS FOUND!
```

---

## Test 6: Leaderboard ✅

**Steps:**
1. Click "Leaderboard" in Gamification Hub
2. Should show instantly (no loading)
3. Should show your username with current XP

**Console Logs:**
```
[DEBUG] Loading leaderboard from database
[DEBUG] Leaderboard loaded { playerCount: X }
```

---

## Test 7: Solve Another Problem ✅

**Steps:**
1. Go back to home
2. Type a problem: "What is 2+2?"
3. Submit
4. Check console

**Expected:**
```
[DEBUG] Problem completed { xp: 10, profileId: null } ✅
[DEBUG] XP data updated successfully { profileId: null } ✅
```

**Check Database:**
```sql
SELECT total_xp FROM xp_data WHERE user_id = 'YOUR_USER_ID';
```
Should show: `total_xp: 120` (110 + 10) ✅

---

## Test 8: Database Final Check ✅

**Run this SQL:**
```sql
-- Should show ONLY 1 record per user with student_profile_id = null
SELECT 
  user_id,
  student_profile_id,
  total_xp,
  level,
  COUNT(*) OVER (PARTITION BY user_id) as record_count
FROM xp_data
ORDER BY updated_at DESC;
```

**Expected:**
- `record_count: 1` for each user ✅
- `student_profile_id: null` for all student records ✅

---

## ✅ Success Criteria

| Test | Pass? | Notes |
|------|-------|-------|
| 1. Fresh Signup | ⬜ | profileId: null in logs |
| 2. Daily Login XP | ⬜ | 60 XP awarded once |
| 3. Daily Challenge | ⬜ | XP updated, streak +1 |
| 4. Page Refresh | ⬜ | No duplicates, instant load |
| 5. Gamification Hub | ⬜ | profileId: null always |
| 6. Leaderboard | ⬜ | Shows correct data |
| 7. Another Problem | ⬜ | XP accumulates |
| 8. Database Check | ⬜ | ONE record per user |

---

## 🚨 If You See These - Bug NOT Fixed!

```
❌ profileId: "aaed5601-fa50-4fcf-886d-d034c9400d61"
❌ DUPLICATE XP RECORDS FOUND!
❌ Error: duplicate key value violates unique constraint
❌ XP query completed { rowCount: 2 }
```

If you see ANY of these, the bug persists. Let me know immediately!

---

## ✅ If You See These - Bug IS Fixed!

```
✅ profileId: null
✅ XP data inserted successfully { profileId: null }
✅ XP data updated successfully { profileId: null }
✅ XP query completed { profileId: null, rowCount: 1 }
✅ No "DUPLICATE XP RECORDS" messages
```

---

## 📝 Quick Commands

**Restart Server:**
```bash
pkill -f "next dev" && sleep 2 && npm run dev
```

**Check Database:**
```sql
-- User count
SELECT COUNT(DISTINCT user_id) FROM xp_data;

-- Show all records
SELECT user_id, student_profile_id, total_xp, level, updated_at 
FROM xp_data 
ORDER BY updated_at DESC;

-- Check for duplicates
SELECT user_id, student_profile_id, COUNT(*) as count
FROM xp_data
GROUP BY user_id, student_profile_id
HAVING COUNT(*) > 1;
```

---

**Ready to test? Run `FORCE_NULL_PROFILE_ID.sql` first, then restart server!** 🚀

