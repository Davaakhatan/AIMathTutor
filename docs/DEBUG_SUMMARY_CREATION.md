# Debug: Why Summaries Aren't Being Created

## Quick Check

1. **Test if table exists**: Visit `http://localhost:3002/api/test-summaries`
   - ✅ If success: Table exists, check other issues below
   - ❌ If error: **Run SQL migration first!**

2. **Check browser console** when solving a problem:
   - Look for: `"Problem completion detected"` 
   - Look for: `"❌ Failed to save conversation summary"`
   - Look for: `"⚠️ TABLE MISSING"`

3. **Check server logs** (terminal where dev server is running):
   - Look for: `"Orchestrator: Handling problem_completed"`
   - Look for: `"Conversation summary created"`

---

## Common Issues

### Issue 1: Table Doesn't Exist ❌
**Symptom**: Error code `42P01` or "relation does not exist"

**Fix**:
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/create_conversation_summaries_table.sql`
3. Verify: Visit `http://localhost:3002/api/test-summaries`

### Issue 2: Problem Completion Not Detected ⚠️
**Symptom**: No `"Problem completion detected"` in logs

**Why**: The AI response doesn't contain completion phrases:
- "correct!"
- "well done"
- "great job"
- "you got it"
- "that's right"

**Check**: Look at the AI's final response. If it doesn't say these phrases, completion won't be detected.

**Fix**: The detection is working as designed. The AI needs to explicitly confirm completion.

### Issue 3: Missing userId or Problem ❌
**Symptom**: `"Problem completed but missing: userId: MISSING"` or `"problem: MISSING"`

**Why**: 
- User not logged in (no userId)
- Problem not set in session

**Fix**: 
- Make sure user is authenticated
- Make sure problem was generated before solving

### Issue 4: Event Not Emitted ⚠️
**Symptom**: Completion detected but orchestrator not handling it

**Check**: 
- Is orchestrator initialized? (Should see `"Ecosystem Orchestrator initialized"` in server logs)
- Check `services/orchestrator.ts` - is it being imported?

---

## Step-by-Step Debugging

### Step 1: Verify Table Exists
```bash
# Visit in browser:
http://localhost:3002/api/test-summaries
```

### Step 2: Solve a Problem
1. Log in as a user
2. Generate a problem
3. Solve it completely
4. Wait for AI to say "correct!" or similar

### Step 3: Check Logs
**Browser Console** (F12):
- Should see: `"Problem completion detected"`
- Should NOT see: `"❌ Failed to save"` or `"⚠️ TABLE MISSING"`

**Server Terminal**:
- Should see: `"Orchestrator: Handling problem_completed"`
- Should see: `"Conversation summary created"`

### Step 4: Check Database
1. Go to Supabase Dashboard → Table Editor
2. Open `conversation_summaries` table
3. Should see a new row with your summary

---

## What Should Happen (Flow)

1. ✅ User solves problem
2. ✅ AI responds with "correct!" or similar
3. ✅ `app/api/chat/route.ts` detects completion (line 382-388)
4. ✅ Event `problem_completed` is emitted (line 400)
5. ✅ `orchestrator.ts` receives event (line 44)
6. ✅ `updateCompanionMemory()` is called (line 61)
7. ✅ `summarizeSession()` generates summary (line 143)
8. ✅ Summary saved to `conversation_summaries` table (line 140)
9. ✅ Goal progress checked (line 167)
10. ✅ Recommendations generated if goal completed (line 190+)

---

## Enhanced Logging Added

I've added better logging to help debug:

1. **Problem completion detection** - Now logs when detected
2. **Missing data warnings** - Warns if userId or problem is missing
3. **Database errors** - Shows specific error codes and hints
4. **Table missing detection** - Specifically detects `42P01` error (table doesn't exist)

---

## Next Steps

1. **Run SQL migrations** if table doesn't exist
2. **Check browser console** when solving next problem
3. **Check server logs** for detailed error messages
4. **Report back** with what you see in logs

The enhanced logging will tell you exactly what's wrong! 🔍

