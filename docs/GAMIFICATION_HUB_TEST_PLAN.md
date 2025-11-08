# Gamification Hub - Complete Test Plan

## 🎯 **Test Flow**

You mentioned testing these scenarios:
1. ✅ Create new user
2. ✅ Check XP display
3. ✅ Solve daily problem
4. ✅ Solve random problem
5. ✅ Use picture upload

Let me walk through what SHOULD happen at each step:

---

## 📋 **Step-by-Step Test Plan**

### **STEP 1: Create New User & First Login** 🆕

**Actions:**
1. Sign up with new email/password
2. Login immediately after signup

**Expected Results:**

#### ✅ **Console Logs:**
```
[INFO] User signed in successfully { userId: "xxx" }
[INFO] Awarding first login bonus XP { xp: 60 }
[INFO] Daily login XP awarded successfully { xp: 60, isFirstLogin: true }
```

#### ✅ **XP & Level Tab (Gamification Hub):**
- **Level:** 1
- **Rank:** Novice (badge: I, gray color)
- **Total XP:** 60 XP
- **Description:** "Just starting the journey"
- **Progress Bar:** 60% (60/100 to Level 2)
- **Problems Solved:** 0
- **Recent Activity:** 
  - "+60 XP - First Login Bonus + Daily Login"

#### ✅ **Database Check:**
```sql
SELECT user_id, student_profile_id, total_xp, level, xp_history
FROM xp_data
WHERE user_id = 'new_user_id';
```
Should show:
- `total_xp: 60`
- `level: 1`
- `xp_history: [{ date: "2025-11-08", xp: 60, reason: "First Login Bonus + Daily Login" }]`

#### ❌ **Should NOT See:**
- NULL user_id errors
- HTTP 403 (RLS blocking)
- HTTP 406 (no rows found)
- Duplicate key errors

---

### **STEP 2: Check Gamification Hub Display** 📊

**Actions:**
1. Click the badge icon (top right, 2nd button)
2. Check all 3 tabs

**Expected Results:**

#### ✅ **XP & Level Tab:**
```
┌─────────────────────────────────────────┐
│ [I]  Level 1         Novice             │
│      Just starting the journey          │
│      60 XP • 2 levels to Apprentice     │
│      ████████████░░░░░░░░ 60%          │
│      40 XP needed                       │
├─────────────────────────────────────────┤
│ [✓] Problems Solved    [★] Total XP    │
│     0                       60          │
├─────────────────────────────────────────┤
│ ━ Recent Activity                       │
│ [+60] First Login Bonus + Daily Login  │
│       Nov 8, 2025, 7:30 PM             │
└─────────────────────────────────────────┘
```

#### ✅ **Achievements Tab:**
- Shows available achievements
- None unlocked yet (0 problems solved)

#### ✅ **Leaderboard Tab:**
- Shows "No players yet" OR your entry if you're the first
- Real-time database data
- Auto-refreshes every 30s

---

### **STEP 3: Solve Daily Problem** 📝

**Actions:**
1. Go to Problem of the Day
2. Click "Start Challenge"
3. Solve the problem with AI tutor
4. Complete and get "Solved!" status
5. Click "Back to Home"

**Expected Results:**

#### ✅ **During Problem:**
- Chat works
- Picture upload works (if you test it)
- AI tutor responds
- Progress tracker shows stages

#### ✅ **After Completion:**
- Problem marked as "Completed" (green checkmark)
- XP gained (e.g., +25 XP for easy, +50 XP for medium, +100 XP for hard)
- Gamification Hub updates:
  - **Total XP:** 60 + problem XP (e.g., 110 XP if +50)
  - **Level:** Still 1 (needs 100 XP to reach Level 2)
  - **Problems Solved:** 1
  - **Recent Activity:** New entry for problem solved

#### ✅ **Console Logs:**
```
[INFO] Problem marked as solved
[INFO] XP updated { newTotal: 110, level: 2 }
```

#### ✅ **Database:**
```sql
-- Check XP updated
SELECT total_xp, level FROM xp_data WHERE user_id = 'xxx';
-- Should show updated values

-- Check problem marked as solved
SELECT * FROM daily_problems_completion 
WHERE user_id = 'xxx' AND problem_date = '2025-11-08';
-- Should have a row

-- Check streak updated
SELECT current_streak, last_study_date FROM streaks WHERE user_id = 'xxx';
-- Should show current_streak: 1, last_study_date: '2025-11-08'
```

---

### **STEP 4: Solve Random Problem (Generate Practice Problem)** 🎲

**Actions:**
1. Click "Generate Practice Problem" button
2. Select type (e.g., Algebra, Geometry)
3. Select difficulty (Easy, Medium, Hard)
4. Click "Generate"
5. Solve the generated problem
6. Complete it

**Expected Results:**

#### ✅ **Generation:**
- Shows loading spinner
- OpenAI generates problem
- Problem displays in chat
- Can start solving immediately

#### ✅ **After Solving:**
- XP gained based on difficulty:
  - Easy: +25 XP
  - Medium: +50 XP
  - Hard: +100 XP
- Total XP increases
- Level might increase (if crossed threshold)
- Problems Solved: +1
- Recent Activity: New entry

#### ❌ **Should NOT See:**
- "Generate Practice Problem not working" error
- OpenAI API errors (if key is set)
- Timeout errors

---

### **STEP 5: Use Picture Upload** 📸

**Actions:**
1. During problem solving
2. Click camera icon or upload button
3. Upload an image (hand-written math, diagram, etc.)
4. AI tutor should analyze the image

**Expected Results:**

#### ✅ **Upload:**
- Image previews before sending
- Image sent to AI tutor
- AI analyzes and responds
- Conversation continues naturally

#### ✅ **AI Response:**
- Tutor acknowledges the image
- Provides feedback on the work shown
- Helps solve the problem

---

### **STEP 6: Check All Gamification Features** 🏆

**After solving 1-2 problems, verify:**

#### ✅ **XP Tab:**
- XP increased from 60 to (60 + problem XP)
- Level might be 2 if you gained 40+ XP
- Rank might upgrade to Apprentice (II) if you hit Level 3
- Progress bar animates smoothly
- Recent activity shows all gains
- Numbers format with commas (1,234)

#### ✅ **Leaderboard Tab:**
- Shows your entry in "Your Rank" card
- Your rank badge matches your level
- Top players list includes you
- XP totals are accurate
- Stats match (problems solved, streak)
- Refreshes every 30s

#### ✅ **Achievements Tab:**
- Shows unlocked achievements (if any)
- Available achievements visible
- Progress indicators work

---

## 🐛 **Common Issues to Watch For**

### Issue 1: XP Not Updating
**Symptoms:** Stuck at 0 XP or 60 XP  
**Check:**
- Console for HTTP errors
- Database for actual XP value
- `updateXPData()` being called

### Issue 2: Leaderboard Empty
**Symptoms:** "No players yet" even though you solved problems  
**Check:**
- Console logs for fetch errors
- Database has xp_data entries
- RLS policies allow SELECT

### Issue 3: Picture Upload Not Working
**Symptoms:** Image not sending or no response  
**Check:**
- Image file size (should be <5MB)
- OpenAI API key is set
- Network tab for upload request

### Issue 4: Daily Problem Not Marking Complete
**Symptoms:** Still shows "Start Challenge" after solving  
**Check:**
- `daily_problems_completion` table has entry
- `problem_date` matches today
- `user_id` and `student_profile_id` correct

---

## ✅ **Success Criteria**

After all tests, you should have:

1. **XP System:**
   - ✅ First login bonus: 60 XP
   - ✅ Problem solving: +XP per problem
   - ✅ Level increases at thresholds
   - ✅ Rank badge shows correctly

2. **Leaderboard:**
   - ✅ Shows your entry
   - ✅ Real-time updates
   - ✅ Rank badges displayed
   - ✅ Accurate stats

3. **Problem Solving:**
   - ✅ Daily problem works
   - ✅ Random problems work
   - ✅ Picture upload works
   - ✅ XP awarded correctly

4. **No Errors:**
   - ✅ No console errors
   - ✅ No HTTP 403/406 errors
   - ✅ No NULL constraint violations
   - ✅ No duplicate key errors

---

## 📸 **Visual Verification**

### XP Display Should Look Like:
```
╔═══════════════════════════════════════╗
║ [Gradient Background - Gray]          ║
║                                        ║
║  ┌────┐  Level 1         Novice       ║
║  │ I  │  Just starting the journey    ║
║  └────┘  60 XP • 2 levels to Appr...  ║
║                                        ║
║  Level 1 → 2              60%         ║
║  ████████████░░░░░░░░                 ║
║  40 XP needed                          ║
╚═══════════════════════════════════════╝
```

### Leaderboard Should Look Like:
```
╔═══════════════════════════════════════╗
║ [Your gradient card with badge]       ║
║  Your Rank #1                          ║
║  Novice • YourName                     ║
║                              60 XP     ║
╠═══════════════════════════════════════╣
║ ━ Top Players          Updates 30s    ║
║ ┌─────────────────────────────────┐   ║
║ │ [1] [I] YourName (You)          │   ║
║ │     Lv.1 • 1 solved • 1 streak  │   ║
║ │                          60 XP  │   ║
║ └─────────────────────────────────┘   ║
╚═══════════════════════════════════════╝
```

---

## 🎮 **Testing Commands**

### Check Database After Tests:
```sql
-- Your XP data
SELECT * FROM xp_data WHERE user_id = 'your_user_id';

-- Your streak
SELECT * FROM streaks WHERE user_id = 'your_user_id';

-- Your solved problems
SELECT COUNT(*) FROM problems 
WHERE user_id = 'your_user_id' AND status = 'solved';

-- Daily completion
SELECT * FROM daily_problems_completion 
WHERE user_id = 'your_user_id';
```

---

## ✅ **Final Checklist**

Before declaring success:

- [ ] New user signup works
- [ ] First login bonus: +60 XP awarded
- [ ] XP displays correctly with rank badge
- [ ] Daily problem can be started
- [ ] Daily problem can be solved
- [ ] Picture upload works in chat
- [ ] XP increases after solving
- [ ] Problem marked as completed
- [ ] Leaderboard shows your entry
- [ ] Rank badge matches your level
- [ ] No console errors
- [ ] No database errors
- [ ] Streak updated to 1 day

---

**Ready to test!** Go through each step and let me know if anything doesn't work as expected. 🚀

