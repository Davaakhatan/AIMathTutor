# Supabase Database Setup Guide

This guide will help you set up Supabase for the AI Math Tutor application.

## 🎯 Why Supabase?

- ✅ **Built-in Authentication** - Email, OAuth, magic links
- ✅ **PostgreSQL Database** - Relational, powerful queries
- ✅ **Real-time Subscriptions** - Perfect for collaboration
- ✅ **Row Level Security** - Multi-tenant ready
- ✅ **Works with Vercel & Amplify** - Flexible deployment
- ✅ **Free Tier** - 500MB database, 2GB bandwidth

## 📋 Prerequisites

1. Create a Supabase account: https://supabase.com
2. Create a new project
3. Note your project URL and anon key

## 🚀 Setup Steps

### 1. Run the Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `schema.sql`
4. Paste and run it

**Note:** The JWT secret is already configured in your Supabase project settings (Settings → API → JWT Secret). You don't need to set it in SQL.

This will create all tables, indexes, RLS policies, triggers, and functions.

### 2. Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only
```

### 3. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 4. Create Supabase Client

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client (for API routes)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## 📊 Database Tables Overview

### Core Tables
- **profiles** - User profiles (extends auth.users)
- **sessions** - Chat sessions (replaces in-memory)
- **problems** - Problem history, bookmarks
- **xp_data** - XP and leveling
- **achievements** - Unlocked achievements
- **streaks** - Study streaks
- **study_sessions** - Timer tracking
- **daily_goals** - Daily study goals

### Learning Tables
- **concept_mastery** - Concept tracking (20+ concepts)
- **difficulty_performance** - Difficulty level performance

### Social Tables
- **study_groups** - Study groups
- **study_group_members** - Group membership
- **shared_problems** - Shared problems
- **collaboration_sessions** - Real-time whiteboard sessions

### Analytics Tables
- **leaderboard** - Global rankings
- **analytics_events** - Event tracking
- **notifications** - User notifications

## 🔐 Row Level Security (RLS)

All tables have RLS enabled:
- Users can only see/modify their own data
- Leaderboard is public read-only
- Study groups have custom policies

## 🔄 Migration from localStorage

The app currently uses localStorage. Migration steps:

1. **Phase 1**: Keep localStorage, add Supabase sync
2. **Phase 2**: Migrate data on login
3. **Phase 3**: Remove localStorage, use Supabase only

## 📱 Real-time Features

Supabase supports real-time subscriptions:

```typescript
// Listen for new messages in a session
const channel = supabase
  .channel('session-messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'sessions' },
    (payload) => {
      console.log('New session:', payload.new)
    }
  )
  .subscribe()
```

## 🧪 Testing

1. Create test users via Supabase Auth
2. Test RLS policies
3. Verify triggers work (auto-create profile, etc.)
4. Test real-time subscriptions

## 📚 Next Steps

1. ✅ Set up Supabase project
2. ✅ Run schema.sql
3. ✅ Install dependencies
4. ✅ Create Supabase client
5. ⏭️ Implement authentication UI
6. ⏭️ Migrate localStorage to Supabase
7. ⏭️ Add real-time features

## 🔗 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

