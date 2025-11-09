# Current Architecture Overview

**Updated:** November 9, 2025  
**Scope:** AI Tutor unified ecosystem (App + APIs + Supabase)

---

## Platform Stack
- **Runtime:** Next.js 14 (App Router) with React 18
- **Styling:** Tailwind CSS + custom gradients, animations
- **Backend:** Supabase (Auth, Postgres, Row-Level Security)
- **LLM Provider:** OpenAI GPT-4o (chat + vision parsing)
- **Event System:** Custom singleton event bus + orchestrator
- **PWA:** Service worker, offline cache, install prompts

---

## Layered Codebase
| Layer | Key Directories | Notes |
| --- | --- | --- |
| **Entry / Routing** | `app/` | Top-level layouts, Next.js App Router pages, API routes |
| **UI Components** | `components/` | Chat UI, dashboards, gamification hub, auth flows, landing page |
| **Business Logic** | `services/` | Conversation orchestration, XP/streak updates, goal system, recommendation engine |
| **State & Hooks** | `hooks/`, `contexts/` | Client hooks for Supabase sync, XP/streak, achievements, goals; global auth/panel contexts |
| **Shared Utilities** | `lib/` | Event bus, Supabase clients, OpenAI client factory, logging, rate limiting, caching |
| **Persistence** | `supabase/migrations/` | SQL migrations for schema + RLS policies |
| **Documentation** | `docs/`, `memory-bank/`, `SESSION_SUMMARY.md` | Vision, PRD, architecture analysis, progress tracking |


---

## Core Systems & Features

### 1. AI Tutoring Engine
- **Problem Intake** (`components/ProblemInput.tsx`, `ProblemGenerator.tsx`, `components/upload/*`)
  - Text entry, AI-generated prompts, image/whiteboard uploads.
  - `/api/parse-problem` leverages GPT-4o for structured problem metadata.
- **Chat Dialogue** (`components/chat/*`, `app/page.tsx`, `services/dialogueManager.ts`)
  - Socratic conversation with streaming responses, sentiment analysis, hint escalation, completion detection.
  - `services/contextManager.ts` persists sessions (Supabase for authenticated users, in-memory fallback).
- **Progress Feedback**
  - `ProblemProgress.tsx` monitors session state and emits `problem_completed` events.
  - Auxiliary tools: bookmarks, history, exports, practice recommendations.

### 2. Gamification & Growth
- **XP & Levels** (`hooks/useXPData.ts`, `services/supabaseDataService.ts`, `components/unified/XPContent.tsx`)
  - Tracks total XP, ranks, history; daily login rewards (`services/dailyLoginService.ts`).
  - Updated through orchestrator when problems complete or referrals succeed.
- **Streak System** (`hooks/useStreakData.ts`, `StudyStreak.tsx`, `services/challengeGenerator.ts`)
  - Current/longest streak, rescue challenges, orchestrator-triggered updates.
- **Achievements** (`hooks/useAchievements.ts`, `components/unified/AchievementsContent.tsx`)
  - Unlock badges for XP milestones, streaks, referrals, goals; UI updates via event listeners.
- **Leaderboards & Rankings** (`services/leaderboardService.ts`, `components/unified/LeaderboardContent.tsx`, `services/rankingService.ts`)
  - Level-based tiers (Novice → Scholar …); Supabase-backed position tracking.
- **Challenges & Referrals** (`services/challengeGenerator.ts`, `components/referral/*`)
  - Auto “Beat My Skill” challenges after each completion, referral XP rewards, share cards, activity feed.

### 3. Study Companion
- **Goal System** (`services/goalSystem.ts`, `hooks/useGoals.ts`, `components/unified/GoalsContent.tsx`)
  - Create/track goals (subject mastery, exam prep, skill-building, daily practice).
  - Completion events trigger recommendations and achievements.
- **Recommendations** (`services/recommendationSystem.ts`)
  - Suggest next subjects/topics based on history, goals, performance.
- **Conversation Memory** (`services/conversationMemory.ts`)
  - Summarizes sessions for context retention.
- **Adaptive Insights** (`AdaptiveProblemSuggestions`, `LearningDashboard`, `ProgressVisualization`, `HelpfulTips`, `PerformanceMonitor`, etc.)
  - Visual analytics, difficulty tuning, conceptual connections, formula references, study timers.

### 4. User & Access Management
- **Auth & Profiles** (`contexts/AuthContext.tsx`, `components/auth/*`, `/api/get-profiles`)
  - Supabase auth, multi-profile support (student/parent/teacher/admin), auto profile creation, RLS enforcement.
- **Settings & Account Actions** (`components/unified/SettingsContent.tsx`, `/api/delete-account`)
  - Preferences, API key override, data backups, full account deletion.
- **Unified Panel** (`contexts/PanelContext.tsx`, `components/unified/*`)
  - Single hub toggling dashboard, history, practice, suggestions, notifications, goals, activity feed, achievements, leaderboard, XP.

### 5. Ecosystem Architecture
- **Event Bus + Orchestrator** (`lib/eventBus.ts`, `services/orchestrator.ts`, `components/OrchestratorInit.tsx`)
  - Singleton pub/sub dispatches `problem_completed`, `goal_completed`, `achievement_unlocked` to coordinate XP updates, streaks, goals, recommendations, challenges.
  - Ensures every problem solved triggers multi-system reactions automatically.
- **PWA Support** (`components/PWAInstaller.tsx`, `ServiceWorkerRegistration.tsx`, `public/sw.js`)
  - Offline cache, install prompts, background sync scaffolding.
- **Documentation & Roadmap** (`docs/PRD.md`, `docs/PROJECT_*`, `docs/ECOSYSTEM_ARCHITECTURE_ANALYSIS.md`, `SESSION_SUMMARY.md`, `memory-bank/*`)
  - Captures product vision, architecture decisions, merge status, outstanding tasks, active context for future sessions.
- **Migrations & Policies** (`supabase/migrations/*.sql`)
  - XP/Streak RLS fixes, student profile protections, referral data handling, constraints to prevent duplicate churn.

---

## High-Level Flow
1. **Student submits or generates a problem.**  
2. **Chat session initializes** (OpenAI prompt, Supabase session record).  
3. **Tutor guides student** via Socratic dialogue; hints escalate if stuck.  
4. **Completion detected** (heuristics + detector) → `problem_completed` event.  
5. **Orchestrator fan-out:** update XP, streaks, goals, challenges, recommendations, achievements, leaderboard, activity feed.  
6. **Unified panel** reflects updates instantly; PWA/service worker keeps experience resilient offline.

---

## Vision Snapshot
> “Every solved problem ignites learning momentum.”  
The AI tutor is the core, but the ecosystem ensures each interaction updates progress, powers adaptive recommendations, fuels social growth loops, and keeps students engaged. The codebase is production-ready for Vercel + Supabase deployment, with extensive documentation to support future iterations (issue triage, logic refinements, phase‑2 expansions).


