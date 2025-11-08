# Action Plan - Fix Critical Issues

**Date**: November 8, 2025  
**Priority Order**: Critical → High → Medium

---

## ✅ **STEP 1: Test Problem of the Day Fix** (5 minutes)

### What to do:
1. Open http://localhost:3002
2. Click "Generate" to create a practice problem
3. Solve it completely (answer until AI congratulates you)
4. **Watch terminal for:**
   ```
   📅 Checking if solved problem matches Problem of the Day...
   ✅ MATCH! Saving Problem of the Day completion...
   ✅ Problem of the Day completion saved successfully!
   ```
5. Run this SQL in Supabase:
   ```sql
   SELECT * FROM daily_problems_completion ORDER BY solved_at DESC;
   ```

### Expected result:
- ✅ You see success message in terminal
- ✅ There's a row in `daily_problems_completion` with your user_id and today's date

### If it doesn't work:
- Send me the terminal output
- Send me the SQL query result
- We'll debug further

---

## ✅ **STEP 2: Investigate Streaks Churn** (10 minutes)

### The Problem:
- 199 inserts, **195 deletes** = only 4 rows remain
- Something is creating/deleting streaks repeatedly

### SQL to run:
```sql
-- Check current streaks
SELECT 
    id,
    user_id,
    student_profile_id,
    current_streak,
    longest_streak,
    last_activity_date,
    created_at,
    updated_at
FROM streaks 
ORDER BY created_at DESC;
```

### Questions to answer:
1. How many unique users in the 4 remaining streak rows?
2. Are the streaks for `user_id` or `student_profile_id`?
3. What are the dates on `last_activity_date`?

### Then run this to check for duplicates:
```sql
-- Check for duplicate streak logic issues
SELECT 
    user_id,
    student_profile_id,
    COUNT(*) as count
FROM streaks
GROUP BY user_id, student_profile_id
HAVING COUNT(*) > 1;
```

### Expected:
- Should return **0 rows** (no duplicates)
- If it returns duplicates, we have a bug!

---

## ✅ **STEP 3: Check Study Sessions vs Sessions** (5 minutes)

### The Confusion:
- `sessions` table: 34 rows, 478 updates (ACTIVELY USED)
- `study_sessions` table: 0 rows, 0 activity (UNUSED!)

### SQL to verify:
```sql
-- Check sessions table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check study_sessions table structure  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'study_sessions' AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Question:
- What's the difference between these two tables?
- Send me both column lists

---

## ✅ **STEP 4: Clean Up Unused Tables** (Optional)

### Tables with 0 rows, 0 activity:
```
challenges
study_groups
study_group_members  
collaboration_sessions
notifications
analytics_events
concept_mastery
difficulty_performance
shared_problems
daily_goals
referrals
```

### Options:
1. **Keep them** - If you plan to implement these features later
2. **Drop them** - If you'll never use them
3. **Ignore them** - They don't hurt anything

### If you want to drop them:
```sql
-- DON'T RUN THIS YET - just for reference
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;
DROP TABLE IF EXISTS study_group_members CASCADE;
DROP TABLE IF EXISTS collaboration_sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS concept_mastery CASCADE;
DROP TABLE IF EXISTS difficulty_performance CASCADE;
DROP TABLE IF EXISTS shared_problems CASCADE;
DROP TABLE IF EXISTS daily_goals CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
```

**⚠️ Wait for my approval before dropping tables!**

---

## 📋 **Summary Checklist:**

- [ ] Step 1: Test Problem of the Day completion save
- [ ] Step 2: Run streak analysis SQL queries
- [ ] Step 3: Compare sessions vs study_sessions columns
- [ ] Step 4: (Optional) Decide on unused tables

---

## 🚀 **Let's Start!**

**Begin with Step 1** - Test the Problem of the Day fix.

Tell me when you're ready or if you have questions!

