# Implementation Plan: PWA + Supabase Integration

## 🎯 Phase 1: PWA (Progressive Web App) - **START HERE**
**Time: 2-3 hours | No database needed**

### Why Start Here?
- ✅ Quick win - makes app installable
- ✅ No database changes needed
- ✅ Improves mobile experience immediately
- ✅ Foundation for offline features

### Tasks:
1. **Create Web App Manifest** (`public/manifest.json`)
   - App name, icons, theme colors
   - Display mode: standalone
   - Start URL, scope

2. **Create Service Worker** (`public/sw.js`)
   - Cache static assets
   - Cache API responses (with limits)
   - Offline fallback page
   - Update strategy

3. **Register Service Worker** (`app/layout.tsx` or component)
   - Register on mount
   - Handle updates
   - Show update notification

4. **Add Install Prompt** (optional component)
   - "Add to Home Screen" button
   - Beforeinstallprompt event handler

5. **Update HTML** (`app/layout.tsx`)
   - Add manifest link
   - Add theme-color meta
   - Add apple-touch-icon

### Files to Create:
- `public/manifest.json`
- `public/sw.js`
- `public/offline.html` (fallback)
- `components/PWAInstaller.tsx` (optional)

### Testing:
- ✅ App installs on mobile
- ✅ Works offline (cached pages)
- ✅ Shows offline indicator
- ✅ Updates work correctly

---

## 🎯 Phase 2: Supabase Setup & Schema
**Time: 1-2 hours**

### Tasks:
1. **Create Supabase Project**
   - Sign up at supabase.com
   - Create new project
   - Get URL and keys

2. **Run Database Schema**
   - Copy `supabase/schema.sql`
   - Run in SQL Editor
   - Verify all tables created

3. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **Create Supabase Client**
   - `lib/supabase.ts` (client-side)
   - `lib/supabase-admin.ts` (server-side)

5. **Add Environment Variables**
   - `.env.local` with Supabase keys

### Files to Create:
- `lib/supabase.ts`
- `lib/supabase-admin.ts`
- Update `.env.local`

### Testing:
- ✅ Can connect to Supabase
- ✅ Can query tables
- ✅ RLS policies work

---

## 🎯 Phase 3: User Authentication
**Time: 4-6 hours**

### Tasks:
1. **Create Auth Components**
   - `components/auth/LoginForm.tsx`
   - `components/auth/SignUpForm.tsx`
   - `components/auth/AuthProvider.tsx`
   - `components/auth/ProtectedRoute.tsx`

2. **Implement Auth Flow**
   - Email/password signup
   - Email/password login
   - Magic link (optional)
   - OAuth (Google/GitHub) - optional
   - Password reset

3. **Create Auth Context**
   - `contexts/AuthContext.tsx`
   - User state management
   - Session management

4. **Update App to Use Auth**
   - Wrap app with AuthProvider
   - Protect routes/components
   - Show user profile

5. **Handle Profile Creation**
   - Auto-create on signup (via trigger)
   - Initialize default data (XP, streaks, etc.)

### Files to Create:
- `components/auth/*` (multiple files)
- `contexts/AuthContext.tsx`
- `hooks/useAuth.ts`

### Testing:
- ✅ Can sign up
- ✅ Can log in
- ✅ Profile auto-created
- ✅ Session persists
- ✅ Can log out

---

## 🎯 Phase 4: Migrate Sessions to Supabase
**Time: 3-4 hours**

### Tasks:
1. **Create Session Service**
   - `services/sessionService.ts`
   - Create session
   - Update session
   - Get session
   - Delete expired sessions

2. **Update API Routes**
   - `app/api/session/route.ts` - Use Supabase
   - `app/api/chat/route.ts` - Use Supabase sessions

3. **Update Frontend**
   - `components/chat/ChatUI.tsx` - Use Supabase sessions
   - Remove in-memory session storage

4. **Add Session Cleanup**
   - Cron job or function to delete expired
   - Or cleanup on app start

### Files to Modify:
- `services/sessionService.ts` (new)
- `app/api/session/route.ts`
- `app/api/chat/route.ts`
- `components/chat/ChatUI.tsx`

### Testing:
- ✅ Sessions persist across refreshes
- ✅ Sessions sync across devices
- ✅ Expired sessions cleaned up
- ✅ Multiple sessions work

---

## 🎯 Phase 5: Migrate User Data to Supabase
**Time: 6-8 hours**

### Tasks:
1. **Create Data Migration Service**
   - `services/dataMigration.ts`
   - Export from localStorage
   - Import to Supabase
   - Handle conflicts

2. **Migrate Each Data Type**
   - Problems (history, bookmarks)
   - XP data
   - Achievements
   - Streaks
   - Study sessions
   - Daily goals
   - Concept mastery
   - Difficulty performance

3. **Update Components**
   - Replace `useLocalStorage` with `useSupabase`
   - Create hooks: `useProblems`, `useXP`, etc.

4. **Add Sync Logic**
   - Sync on login
   - Sync on changes
   - Handle offline/online

### Files to Create:
- `services/dataMigration.ts`
- `hooks/useSupabase.ts`
- `hooks/useProblems.ts`
- `hooks/useXP.ts`
- `hooks/useStreaks.ts`
- etc.

### Files to Modify:
- All components using `useLocalStorage`

### Testing:
- ✅ Data migrates correctly
- ✅ New data saves to Supabase
- ✅ Data syncs across devices
- ✅ Works offline (with sync)

---

## 🎯 Phase 6: Real-time Collaboration
**Time: 8-10 hours**

### Tasks:
1. **Create Collaboration Service**
   - `services/collaborationService.ts`
   - Create study groups
   - Join/leave groups
   - Share problems

2. **Real-time Whiteboard**
   - Use Supabase Realtime
   - Sync whiteboard state
   - Multi-user support

3. **Create Collaboration UI**
   - `components/collaboration/StudyGroups.tsx`
   - `components/collaboration/SharedProblems.tsx`
   - `components/collaboration/CollaborativeWhiteboard.tsx`

4. **Add Notifications**
   - Real-time notifications
   - Study group invites
   - Shared problem alerts

### Files to Create:
- `services/collaborationService.ts`
- `components/collaboration/*` (multiple)

### Testing:
- ✅ Can create/join groups
- ✅ Can share problems
- ✅ Whiteboard syncs in real-time
- ✅ Notifications work

---

## 🎯 Phase 7: Advanced Analytics
**Time: 4-6 hours**

### Tasks:
1. **Create Analytics Service**
   - `services/analyticsService.ts`
   - Track events
   - Generate reports

2. **Create Analytics Dashboard**
   - `components/analytics/AnalyticsDashboard.tsx`
   - Weekly/monthly reports
   - Learning velocity
   - Weak areas

3. **Add Analytics Events**
   - Problem solved
   - Hint used
   - Session started
   - etc.

### Files to Create:
- `services/analyticsService.ts`
- `components/analytics/*`

### Testing:
- ✅ Events tracked correctly
- ✅ Reports accurate
- ✅ Performance good

---

## 📊 Estimated Timeline

| Phase | Time | Dependencies |
|-------|------|--------------|
| Phase 1: PWA | 2-3h | None |
| Phase 2: Supabase Setup | 1-2h | None |
| Phase 3: Auth | 4-6h | Phase 2 |
| Phase 4: Sessions | 3-4h | Phase 3 |
| Phase 5: Data Migration | 6-8h | Phase 3 |
| Phase 6: Collaboration | 8-10h | Phase 5 |
| Phase 7: Analytics | 4-6h | Phase 5 |

**Total: 28-39 hours** (3-5 days of focused work)

---

## 🎯 Recommended Order

**Week 1:**
1. ✅ Phase 1: PWA (quick win)
2. ✅ Phase 2: Supabase Setup
3. ✅ Phase 3: Auth (foundation)

**Week 2:**
4. ✅ Phase 4: Sessions
5. ✅ Phase 5: Data Migration

**Week 3:**
6. ✅ Phase 6: Collaboration
7. ✅ Phase 7: Analytics

---

## 🚀 Quick Start (Today)

If you want to start TODAY:

1. **Phase 1: PWA** (2-3 hours) - Makes app installable
2. **Phase 2: Supabase Setup** (1-2 hours) - Database ready
3. **Phase 3: Auth** (4-6 hours) - Users can sign up

This gives you:
- ✅ Installable app (PWA)
- ✅ Database ready
- ✅ User authentication

Then continue with phases 4-7 as needed.

---

## 📝 Notes

- Each phase is independent enough to test separately
- Can deploy after each phase
- Backward compatible (keep localStorage during migration)
- Real-time features require Supabase (Phase 6)
- Analytics can be added incrementally (Phase 7)

