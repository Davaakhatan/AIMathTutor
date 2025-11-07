# Week 2 Setup Instructions
## Study Companion Core - Database Migrations

**Date**: November 2025  
**Status**: Ready to Deploy

---

## Step 1: Run SQL Migrations

You need to run **2 SQL migrations** in Supabase to create the new tables:

### Migration 1: Conversation Summaries
**File**: `supabase/migrations/create_conversation_summaries_table.sql`

**What it creates**:
- `conversation_summaries` table
- Indexes for performance
- RLS policies for security

**How to run**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `create_conversation_summaries_table.sql`
3. Paste into SQL Editor
4. Click "Run"

### Migration 2: Learning Goals
**File**: `supabase/migrations/create_learning_goals_table.sql`

**What it creates**:
- `learning_goals` table
- Indexes for performance
- RLS policies for security
- Trigger for auto-updating `updated_at`

**How to run**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `create_learning_goals_table.sql`
3. Paste into SQL Editor
4. Click "Run"

---

## Step 2: Verify Tables Created

After running both migrations, verify the tables exist:

1. Go to Supabase Dashboard → Table Editor
2. You should see:
   - ✅ `conversation_summaries`
   - ✅ `learning_goals`

---

## Step 3: Test the Features

### Test Conversation Summaries
1. Log in as a user
2. Solve a math problem
3. Complete the problem (AI says "correct!")
4. Check logs - you should see "Conversation summary created"
5. Check database - `conversation_summaries` table should have a new row

### Test Goal System
1. Create a goal via API (or we can build UI later):
   ```bash
   POST /api/companion/goals
   {
     "userId": "your-user-id",
     "profileId": "your-profile-id",
     "goal_type": "subject_mastery",
     "target_subject": "Algebra",
     "target_date": null
   }
   ```
2. Solve problems related to that subject
3. Goal progress should auto-update
4. When progress reaches 100%, goal should be marked complete

### Test Recommendations
1. Complete a goal
2. Check logs - you should see "Subject recommendations generated"
3. Call API to get recommendations:
   ```bash
   GET /api/companion/recommendations?userId=xxx&subject=Algebra&goalType=subject_mastery
   ```

---

## What's Working Now

✅ **Event System** - Events are being emitted  
✅ **Orchestrator** - Coordinates all systems  
✅ **Conversation Summaries** - AI summarizes sessions  
✅ **Goal System** - Tracks and updates goals  
✅ **Recommendations** - Suggests next subjects  

---

## Next Steps (Week 3)

After verifying Week 2 works:
- Agentic Actions (auto challenges)
- Presence UI (activity feed)
- Challenge System (database + API)

---

## Troubleshooting

### If migrations fail:
- Check if tables already exist (drop them first if needed)
- Check RLS policies aren't conflicting
- Verify you have proper permissions in Supabase

### If summaries aren't being created:
- Check OpenAI API key is set
- Check logs for errors
- Verify session has messages before completion

### If goals aren't updating:
- Check goal exists in database
- Check problem type matches goal subject
- Check logs for errors

---

**Ready to continue?** Once migrations are run and tested, we can move to Week 3!

