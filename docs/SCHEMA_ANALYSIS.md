# Database Schema Analysis - November 8, 2025

Based on actual usage data from `pg_stat_user_tables`.

---

## 📊 **ACTIVELY USED TABLES** (Have Data & Activity)

### 🔥 HIGH ACTIVITY (Critical Tables):

1. **`xp_data`** - 44 rows
   - Status: ✅ **WORKING PERFECTLY**
   - Activity: 44 inserts, 0 updates
   - Usage: XP and level tracking for all users

2. **`sessions`** - 34 rows, **478 UPDATES!**
   - Status: ✅ **VERY ACTIVE**
   - Activity: 51 inserts, 478 updates, 16 deletes
   - Usage: Chat sessions (not study_sessions!)
   - Note: This is your AI tutor conversation sessions

3. **`problems`** - 38 rows
   - Status: ✅ **ACTIVE**
   - Activity: 55 inserts, 16 deletes
   - Usage: Problem history tracking

4. **`conversation_summaries`** - 28 rows
   - Status: ✅ **ORCHESTRATOR WORKING!**
   - Activity: 33 inserts, 5 deletes
   - Usage: AI-generated conversation summaries
   - Note: We saw one created today (ID: ff106282-8449-4d8d-936a-eac2b6a50e5f)

5. **`shares`** - 28 rows, **181 UPDATES!**
   - Status: ✅ **VERY ACTIVE**
   - Activity: 60 inserts, 181 updates, 32 deletes
   - Usage: Problem sharing system
   - Note: We saw code W4OXJFM9 created today

### ✅ MODERATE ACTIVITY:

6. **`profiles`** - 7 rows
   - Status: ✅ **CORE TABLE**
   - Activity: 7 inserts, 8 updates
   - Usage: User profiles (7 users total)

7. **`achievements`** - 5 rows
   - Status: ✅ **WORKING**
   - Activity: 23 inserts (18 deleted elsewhere?)
   - Usage: Unlocked achievements

8. **`referral_codes`** - 4 rows
   - Status: ✅ **WORKING**
   - Activity: 4 inserts, 1 update
   - Usage: Referral system codes

9. **`student_profiles`** - 4 rows
   - Status: ✅ **WORKING**
   - Activity: 15 inserts, 3 updates, 8 deletes
   - Usage: Student sub-profiles for parents/teachers

10. **`profile_relationships`** - 2 rows
    - Status: ✅ **WORKING**
    - Activity: 2 inserts
    - Usage: Parent/teacher → student relationships

11. **`learning_goals`** - 2 rows
    - Status: ✅ **WORKING**
    - Activity: 3 inserts, 4 updates, 1 delete
    - Usage: User learning goals (Study Companion feature)

12. **`daily_problems`** - 1 row
    - Status: ✅ **WORKING**
    - Activity: 1 insert, 7 updates
    - Usage: Today's Problem of the Day

---

## ⚠️ **PROBLEMATIC TABLES** (Data Issues)

### 🚨 CRITICAL ISSUES:

1. **`streaks`** - 4 rows, **195 DELETES!**
   - Status: 🚨 **MASSIVE CHURN**
   - Activity: 199 inserts, 1 update, **195 DELETES**
   - Problem: Something is creating and deleting streaks repeatedly!
   - Likely Cause: Bug in streak logic or duplicate prevention
   - **ACTION NEEDED:** Investigate streak creation/deletion logic

2. **`daily_problems_completion`** - **0 ROWS!**
   - Status: 🚨 **CRITICAL - WE FIXED THIS TODAY!**
   - Activity: 1 insert, **1 DELETE**, 0 current rows
   - Problem: Data was inserted then immediately deleted!
   - Likely Cause: RLS policy or constraint violation?
   - **ACTION NEEDED:** Test the fix we applied today (auto-save in API route)

### ⚠️ PREVIOUSLY USED BUT CLEARED:

3. **`leaderboard`** - 0 rows
   - Status: ⚠️ **WAS USED, NOW EMPTY**
   - Activity: 9 inserts, 4 deletes
   - Problem: All entries were deleted or cleared
   - Note: Feature might be deprecated or reset

---

## ❌ **COMPLETELY UNUSED TABLES** (0 Rows, 0 Activity)

These tables have **NEVER been used** in your production database:

### Category A: Features Not Implemented

1. **`challenges`** - 0 rows, 0 activity
   - Code exists but never executed
   - Can be SAFELY IGNORED or removed

2. **`study_groups`** - 0 rows, 0 activity
   - Feature not implemented
   - Can be SAFELY IGNORED or removed

3. **`study_group_members`** - 0 rows, 0 activity
   - Feature not implemented
   - Can be SAFELY IGNORED or removed

4. **`collaboration_sessions`** - 0 rows, 0 activity
   - Real-time collaboration not implemented
   - Can be SAFELY IGNORED or removed

5. **`notifications`** - 0 rows, 0 activity
   - Notification system not implemented
   - Can be SAFELY IGNORED or removed

6. **`analytics_events`** - 0 rows, 0 activity
   - Analytics not implemented
   - Can be SAFELY IGNORED or removed

7. **`concept_mastery`** - 0 rows, 0 activity
   - Feature not implemented
   - Can be SAFELY IGNORED or removed

8. **`difficulty_performance`** - 0 rows, 0 activity
   - Performance tracking not implemented
   - Can be SAFELY IGNORED or removed

### Category B: Duplicates or Replaced

9. **`shared_problems`** - 0 rows, 0 activity
   - Status: 🤔 **DUPLICATE OF `shares`?**
   - Note: `shares` table is actively used (28 rows)
   - Can be SAFELY REMOVED

### Category C: Code References But Never Used

10. **`study_sessions`** - 0 rows, 0 activity
    - Status: ⚠️ **CODE REFERENCES THIS!**
    - Problem: We fixed schema issues today, but no data ever saved
    - Note: `sessions` table is used instead (34 rows)
    - Confusion: Two session tables (`sessions` vs `study_sessions`)

11. **`daily_goals`** - 0 rows, 0 activity
    - Status: ⚠️ **CODE REFERENCES THIS!**
    - Problem: useDailyGoals hook exists but never saves data
    - Can be SAFELY IGNORED (feature not actually used)

12. **`referrals`** - 0 rows, 0 activity
    - Status: ⚠️ **CODE MIGHT USE THIS**
    - Note: `referral_codes` works (4 rows), but actual referrals never tracked
    - Can be SAFELY IGNORED for now

---

## 📈 **USAGE SUMMARY**

### By Row Count:
```
xp_data:                    44 rows ████████████████████
problems:                   38 rows ███████████████████
sessions:                   34 rows █████████████████
conversation_summaries:     28 rows ██████████████
shares:                     28 rows ██████████████
profiles:                    7 rows ███
achievements:                5 rows ██
referral_codes:              4 rows ██
student_profiles:            4 rows ██
streaks:                     4 rows ██
profile_relationships:       2 rows █
learning_goals:              2 rows █
daily_problems:              1 row  ▌
```

### By Activity (inserts + updates + deletes):
```
sessions:                   545 operations ████████████████████
streaks:                    395 operations ███████████████
shares:                     273 operations ████████████
problems:                    71 operations ███
xp_data:                     44 operations ██
conversation_summaries:      38 operations ██
student_profiles:            26 operations █
achievements:                23 operations █
```

---

## 🎯 **RECOMMENDATIONS**

### IMMEDIATE ACTIONS:

1. **✅ Test Problem of the Day Fix**
   - Table: `daily_problems_completion`
   - Issue: Data inserted then deleted (0 rows remain)
   - Our Fix: Auto-save in API route (applied today)
   - **ACTION:** Solve a problem and verify data persists!

2. **🔍 Investigate Streaks Churn**
   - Table: `streaks`
   - Issue: 199 inserts, 195 deletes (massive churn)
   - Likely: Duplicate prevention or reset logic bug
   - **ACTION:** Check streak creation/deletion logic

3. **🧹 Clean Up Study Sessions Confusion**
   - Tables: `sessions` (used) vs `study_sessions` (unused)
   - Issue: Two tables for similar purpose
   - Code references `study_sessions` but uses `sessions`
   - **ACTION:** Decide which one to keep, update code accordingly

### OPTIONAL CLEANUP:

4. **Remove Unused Tables** (if not planning to implement):
   - `challenges` (0 rows, 0 activity)
   - `study_groups` + `study_group_members` (0 rows, 0 activity)
   - `collaboration_sessions` (0 rows, 0 activity)
   - `notifications` (0 rows, 0 activity)
   - `analytics_events` (0 rows, 0 activity)
   - `concept_mastery` (0 rows, 0 activity)
   - `difficulty_performance` (0 rows, 0 activity)
   - `shared_problems` (duplicate of `shares`)
   - `daily_goals` (code exists but never used)
   - `referrals` (codes work, but tracking unused)

5. **Optimize Active Tables**
   - `sessions` - 478 updates! Consider archiving old sessions
   - `shares` - 181 updates! Consider cleanup strategy
   - `xp_data` - 44 rows, all users - working perfectly! ✅

---

## 🎉 **WORKING PERFECTLY**

These features are actively used and working well:
- ✅ XP & Level system (`xp_data`)
- ✅ AI Tutor Sessions (`sessions`)
- ✅ Problem History (`problems`)
- ✅ Conversation Summaries (`conversation_summaries`) - Orchestrator working!
- ✅ Problem Sharing (`shares`)
- ✅ User Profiles (`profiles`)
- ✅ Achievements (`achievements`)
- ✅ Referral Codes (`referral_codes`)
- ✅ Student Profiles (`student_profiles`)
- ✅ Learning Goals (`learning_goals`)
- ✅ Problem of the Day (`daily_problems`)

---

## 🚨 **NEEDS ATTENTION**

1. **Streaks** - High churn, possible bug
2. **Daily Problems Completion** - Data not persisting (we fixed today, needs testing)
3. **Study Sessions** - Table exists but unused, code confusion with `sessions`

---

## 💡 **KEY INSIGHTS**

- **You have 7 active users** (7 profiles)
- **44 XP records** = excellent user engagement
- **34 active sessions** with **478 updates** = heavy AI tutor usage
- **28 conversation summaries** = Orchestrator is working!
- **28 shares** with **181 updates** = sharing feature is popular
- **Streaks are problematic** = needs investigation
- **Many unused tables** = opportunity for cleanup

---

## ✅ **TABLES WE FIXED TODAY**

1. ✅ `xp_data` - Fixed composite unique constraint
2. ✅ `streaks` - Fixed composite unique constraint (but still has churn issue)
3. ✅ `study_sessions` - Fixed schema mismatch (but table is unused!)
4. ✅ `daily_problems_completion` - Fixed RLS + added auto-save in API route

**Next:** Test if these fixes work in production!

