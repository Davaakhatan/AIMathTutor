# Phase-Based Stabilization Plan

This document tracks the stabilization work needed to make the AI Tutor ecosystem production-ready (Vercel + Supabase). Each task builds on the previous phase; complete a phase before moving to the next.

## Phase 0 – Foundation (✅ Complete)
- [x] Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- [x] Push canonical schema (`20241109150000_initial_schema.sql`) to Supabase  
- [x] Add dedupe + unique constraints for XP/Streak (`20241109153000_xp_streak_unique_constraints.sql`)
- [x] Clear per-user caches (`aitutor-daily-problem`) on logout
- [x] Unregister service worker during development
- [x] Restart dev server and confirm chat works end-to-end

## Phase 1 – Critical Data Paths (🚧 In Progress)
1. **XP & Streak Hooks**
   - [ ] Re-enable Supabase loading in `useXPData` and `useStreakData`
   - [ ] Keep localStorage as cache, but hydrate from DB first
   - [ ] Display loading state while fetching
2. **Problem of the Day**
   - [ ] Confirm `/api/daily-problem` writes completions to `daily_problems_completion`
   - [ ] Verify new login fetches fresh problem (no stale cache)
3. **Profiles & Sessions**
   - [ ] `/api/get-profiles` auto-creates profiles/student profiles after login
   - [ ] `contextManager` persists chat sessions in `sessions` table
4. **Orchestrator Validation**
   - [ ] Update orchestrator to use `Promise.allSettled`
   - [ ] Log and surface errors gracefully
   - [ ] Confirm `problem_completed` updates XP, streaks, goals, activity feed, challenges

## Phase 2 – Feature-by-Feature QA
1. **Goals & Recommendations**
   - [ ] CRUD on `learning_goals` tables
   - [ ] `goalSystem` updates progress & completion
   - [ ] `recommendationSystem` generates suggestions
2. **Conversation Memory**
   - [ ] `conversation_summaries` table populated post-session
   - [ ] Summaries load into new chat prompts
3. **Challenges & Referrals**
   - [ ] Challenge generation writes to `challenges`
   - [ ] Referral API updates `referrals` & XP without duplicates
   - [ ] Activity feed entries created on orchestration events
4. **Leaderboards & Analytics**
   - [ ] Leaderboard queries efficient (indexes)
   - [ ] XP history accurate after multiple updates

## Phase 3 – Best Practices & Hardening
- [ ] Enable RLS on all tables with appropriate policies
- [ ] Integrate error telemetry (e.g., Sentry)
- [ ] Add integration test for signup → POD → XP/Streak → logout/login
- [ ] Consider SWR/React Query for cached data loading
- [ ] Verify env vars and migrations run in Vercel deploy pipeline

## Notes
