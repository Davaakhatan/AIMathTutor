# Product Requirements Document (PRD)
## AI Math Tutor - Unified Ecosystem Platform

**Version**: 3.1 (Unified Ecosystem)
**Date**: November 2025
**Status**: Active Development - Phase 1 (75% Complete)

---

## Executive Summary

This PRD defines the **unified ecosystem platform** that seamlessly integrates three core systems:
1. **Core AI Tutoring** - Socratic method-based math tutoring (✅ Complete)
2. **Viral Growth System** - Social features and referral mechanics (✅ 80% Complete)
3. **AI Study Companion** - Persistent learning companion with memory (✅ 70% Complete)

**Key Innovation**: These systems are **not separate features** - they form a **cohesive ecosystem** where each system enhances and triggers the others through a unified event orchestration layer.

---

## Product Vision

Transform the AI Math Tutor into a **social, engaging, intelligent learning ecosystem** that:
- **Teaches** students math through Socratic questioning (Core)
- **Grows** organically through viral mechanics and social engagement (Growth)
- **Remembers** and adapts to each student's learning journey (Companion)
- **Orchestrates** all systems to work together seamlessly (Ecosystem)

### Ecosystem Principles

1. **Unified Event System**: All features communicate via events
2. **Orchestrated Actions**: Problem completion triggers growth + companion actions
3. **Shared Data Model**: Single source of truth (Supabase)
4. **Seamless Integration**: Features enhance each other, not isolated
5. **User-Centric Flow**: Natural journey through all systems

---

## Current State

### ✅ Completed Features
- Core AI tutoring with Socratic method
- Problem input (text, image, whiteboard)
- Chat-based dialogue system
- XP/Gamification system
- User authentication (Supabase)
- Student profiles (Model B)
- PWA support
- Persistent session storage (Supabase)
- Learning dashboard & analytics
- Concept tracking & mastery
- Difficulty tracking & recommendations

### 🚧 In Progress
- Parent/Teacher linking UI
- Profile relationship management

### 📋 Planned (This PRD)
- Viral growth features (Phase 1)
- AI Study Companion features (Phase 1)

---

## Phase 1: Viral Growth Features (Simplified)

### 1.1 Share Cards & Deep Links

**Goal**: Make achievements and results shareable

**Features**:
- Share cards for:
  - Problem completions
  - Achievement unlocks
  - Streak milestones
  - Learning progress
- Deep links that:
  - Pre-fill problem context
  - Land users in "Try Now" micro-task (5-question challenge)
  - Track attribution (referrer, source)

**Implementation**:
- `components/ShareCard.tsx` - Generate shareable cards
- `app/api/share/route.ts` - Handle share link generation
- `app/api/deep-link/route.ts` - Handle deep link routing
- Share button in:
  - Achievement badges
  - Problem completion screens
  - Progress dashboard

**Success Metrics**:
- Share click rate: >5% of completions
- Deep link conversion: >20% to signup
- Deep link FVM: >60% complete micro-task

---

### 1.2 Basic Referral System

**Goal**: Reward users for inviting friends

**Features**:
- Referral link generation (unique per user)
- Referral tracking in database
- Rewards for both referrer and referee:
  - Referrer: XP bonus, streak shield, AI minutes
  - Referee: Welcome bonus, first problem boost
- Referral dashboard showing:
  - Total referrals
  - Active referrals
  - Rewards earned

**Implementation**:
- `services/referralService.ts` - Referral logic
- `components/ReferralDashboard.tsx` - Referral UI
- Database table: `referrals`
  - `referrer_id`, `referee_id`, `status`, `created_at`
- API route: `app/api/referral/route.ts`

**Success Metrics**:
- Referral rate: >10% of users refer someone
- Referral conversion: >30% of referrals sign up
- Referral retention: +10% D7 retention for referred users

---

### 1.3 Simple Leaderboards

**Goal**: Add competitive element

**Features**:
- Subject-based leaderboards (Algebra, Geometry, etc.)
- Weekly/monthly leaderboards
- Friend leaderboards (if friends connected)
- Leaderboard filters:
  - All time
  - This week
  - This month
  - Friends only

**Implementation**:
- Enhance existing `components/Leaderboard.tsx`
- Database queries for rankings
- Real-time updates (polling or SSE)
- Privacy controls (opt-in to leaderboards)

**Success Metrics**:
- Leaderboard engagement: >40% of users view
- Competition effect: +15% problems solved for leaderboard users

---

### 1.4 Challenge System

**Goal**: Enable peer-to-peer challenges

**Features**:
- "Beat My Score" challenges
  - After completing a problem, share challenge
  - Friend gets same problem type
  - Both get rewards if friend completes
- Streak rescue challenges
  - When streak at risk, invite friend to co-practice
  - Both get streak shields on completion
- Challenge notifications
  - In-app notifications
  - Email/SMS (optional)

**Implementation**:
- `services/challengeService.ts` - Challenge logic
- `components/ChallengeCard.tsx` - Challenge UI
- Database table: `challenges`
  - `challenger_id`, `challengee_id`, `problem_id`, `status`, `created_at`
- API route: `app/api/challenge/route.ts`

**Success Metrics**:
- Challenge acceptance rate: >50%
- Challenge completion rate: >70%
- Viral coefficient: K ≥ 0.5 (challenges per user)

---

## Phase 1: AI Study Companion Features (Simplified)

### 2.1 Persistent Conversation Memory

**Goal**: AI remembers previous sessions

**Features**:
- Store conversation summaries in database
- Load context on new sessions
- Reference previous problems/concepts
- Adaptive suggestions based on history

**Implementation**:
- Database table: `conversation_summaries`
  - `user_id`, `session_id`, `summary`, `concepts_covered`, `created_at`
- Update `services/contextManager.ts` to:
  - Save summaries after sessions
  - Load relevant summaries on new sessions
  - Include in prompt context
- API route: `app/api/summaries/route.ts`

**Success Metrics**:
- Context retention: >80% of users see relevant references
- Engagement: +20% session length with memory

---

### 2.2 Goal-Based Learning Paths

**Goal**: Help students set and track learning goals

**Features**:
- Goal creation (e.g., "Master Algebra", "Prepare for SAT")
- Goal progress tracking
- Related subject suggestions after goal completion
  - SAT complete → suggest college essays, AP prep
  - Chemistry → suggest physics, STEM subjects
- Multi-goal progress dashboard

**Implementation**:
- Database table: `learning_goals`
  - `user_id`, `goal_type`, `target_date`, `status`, `progress`
- `components/LearningGoals.tsx` - Goal management UI
- `services/goalService.ts` - Goal logic
- Subject recommendation engine
- API route: `app/api/goals/route.ts`

**Success Metrics**:
- Goal completion rate: >60%
- Related subject engagement: >40% after goal completion
- Churn reduction: -20% "goal achieved" churn

---

### 2.3 Adaptive Practice Suggestions

**Goal**: AI assigns practice based on performance

**Features**:
- AI-generated practice decks
- Spaced repetition system
- Mastery-based progression
- Weak area focus

**Implementation**:
- Enhance existing `components/AdaptiveProblemSuggestions.tsx`
- Database table: `practice_assignments`
  - `user_id`, `problem_ids`, `due_date`, `completed`
- Spaced repetition algorithm
- API route: `app/api/practice/route.ts`

**Success Metrics**:
- Practice completion rate: >70%
- Mastery improvement: +25% concept mastery
- Retention: +15% D7 retention for users with practice

---

### 2.4 Re-engagement Nudges

**Goal**: Bring back inactive users

**Features**:
- Detect users with <3 sessions by Day 7
- Send personalized nudge:
  - "You're doing great! Ready for your next challenge?"
  - Suggest related problem
  - Offer streak shield
- In-app notifications
- Email notifications (optional)

**Implementation**:
- Background job to detect inactive users
- `services/reEngagementService.ts` - Nudge logic
- Notification system
- API route: `app/api/nudges/route.ts`

**Success Metrics**:
- Nudge response rate: >30%
- Re-engagement: +25% return rate for nudged users
- Churn reduction: -15% early churn

---

## Unified Ecosystem Architecture

### Event-Driven Architecture

The platform uses an **event bus** to orchestrate interactions between systems:

```typescript
// Event Types
type EventType = 
  | 'problem_completed'
  | 'goal_achieved'
  | 'streak_at_risk'
  | 'achievement_unlocked'
  | 'session_started'
  | 'session_ended';

// Event Flow Example
problem_completed → {
  growth: ['generate_challenge', 'create_share'],
  companion: ['summarize_session', 'update_memory', 'check_goals'],
  gamification: ['award_xp', 'update_streak']
}
```

### Orchestrator Service

The `EcosystemOrchestrator` coordinates all systems:

```typescript
class EcosystemOrchestrator {
  async onProblemCompleted(userId: string, problem: ParsedProblem) {
    // Parallel execution
    await Promise.all([
      this.updateGamification(userId, problem),
      this.triggerGrowthActions(userId, problem),
      this.updateCompanionMemory(userId, problem),
      this.checkGoals(userId, problem)
    ]);
  }
}
```

### Database Schema (Unified)

```sql
-- Core: Sessions (existing)
-- Core: Problems (existing)
-- Core: Messages (existing)

-- Growth: Referrals (existing)
-- Growth: Referral Codes (existing)
-- Growth: Shares (existing)

-- Growth: Challenges (NEW)
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES auth.users(id),
  challengee_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  challenge_type TEXT NOT NULL, -- 'beat_score', 'streak_rescue', 'co_practice'
  problem_id UUID,
  share_code TEXT REFERENCES shares(share_code),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'expired'
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companion: Conversation Summaries (NEW)
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  session_id UUID,
  summary TEXT NOT NULL,
  concepts_covered TEXT[],
  difficulty_level TEXT,
  problem_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companion: Learning Goals (NEW)
CREATE TABLE learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  goal_type TEXT NOT NULL, -- 'subject_mastery', 'exam_prep', 'skill_building'
  target_subject TEXT NOT NULL,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused'
  progress INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companion: Practice Assignments (NEW)
CREATE TABLE practice_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  assignment_type TEXT NOT NULL, -- 'adaptive', 'goal_based', 'weak_area'
  problems JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presence: Activity Feed (NEW)
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  activity_type TEXT NOT NULL, -- 'problem_solved', 'achievement', 'goal_completed', 'challenge_created'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_challengee ON challenges(challengee_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_summaries_user_profile ON conversation_summaries(user_id, student_profile_id);
CREATE INDEX idx_summaries_created ON conversation_summaries(created_at DESC);
CREATE INDEX idx_goals_user_profile ON learning_goals(user_id, student_profile_id);
CREATE INDEX idx_goals_status ON learning_goals(status);
CREATE INDEX idx_activity_user ON activity_feed(user_id);
CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);
```

### API Routes (Organized by Domain)

```
# Core Tutoring (existing)
/api/chat - Chat messages
/api/parse-problem - Parse problem
/api/session - Session management

# Growth System
/api/growth/
  ├── share/generate - Generate share card
  ├── share/[code] - Get share by code
  ├── referral/stats - Get referral stats
  ├── referral/list - List referrals
  ├── referral/track-signup - Track signup
  ├── challenge/create - Create challenge
  ├── challenge/accept - Accept challenge
  └── presence/feed - Get activity feed

# Study Companion
/api/companion/
  ├── memory/summaries - Get conversation summaries
  ├── memory/summarize - Create summary
  ├── goals - CRUD goals
  ├── goals/[id]/complete - Complete goal
  ├── practice/assign - Assign practice
  ├── practice/list - List assignments
  └── recommendations - Get subject recommendations

# Analytics & Events
/api/analytics/
  └── events - Track events
```

### Services (Unified)

```
services/
  # Core
  problemParser.ts - Parse problems
  dialogueManager.ts - Dialogue orchestration
  contextManager.ts - Context management
  
  # Growth
  referralService.ts - Referral logic
  challengeService.ts - Challenge logic
  shareService.ts - Share card generation
  presenceService.ts - Activity feed
  
  # Companion
  goalService.ts - Goal management
  practiceService.ts - Practice assignment
  conversationSummaryService.ts - Summary management
  recommendationService.ts - Subject recommendations
  reEngagementService.ts - Re-engagement logic
  
  # Orchestration (NEW)
  orchestrator.ts - Ecosystem orchestrator
  eventBus.ts - Event system
```

### Event System

```typescript
// lib/eventBus.ts
interface Event {
  type: EventType;
  userId: string;
  profileId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

class EventBus {
  emit(event: Event): Promise<void>;
  on(eventType: EventType, handler: (event: Event) => Promise<void>): void;
  off(eventType: EventType, handler: Function): void;
}
```

---

## Success Metrics

### Viral Growth Metrics
- **K-Factor**: ≥ 0.5 (challenges + referrals per user)
- **Referral Rate**: ≥ 10% of users refer someone
- **Share Rate**: ≥ 5% of completions shared
- **Deep Link Conversion**: ≥ 20% to signup
- **Deep Link FVM**: ≥ 60% complete micro-task

### Study Companion Metrics
- **Memory Usage**: ≥ 80% of users see relevant references
- **Goal Completion**: ≥ 60% of goals completed
- **Practice Engagement**: ≥ 70% completion rate
- **Re-engagement**: ≥ 30% response rate to nudges

### Overall Metrics
- **Activation**: +20% lift to FVM
- **Retention**: +10% D7 retention for referred users
- **Engagement**: +15% problems solved for leaderboard users
- **Churn Reduction**: -20% "goal achieved" churn, -15% early churn

---

## Phase-Based Implementation Plan

### Phase 0: Foundation ✅ (Complete)
- Core tutoring system
- User authentication (Model B)
- Basic gamification
- Database setup

### Phase 1: Ecosystem Cohesion (4 weeks)

#### Week 1: Event System & Orchestration ✅ COMPLETE
- [x] Build event bus (`lib/eventBus.ts`)
- [x] Create orchestrator service (`services/orchestrator.ts`)
- [x] Integrate with existing features
- [x] Test event flow end-to-end

#### Week 2: Study Companion Core ✅ COMPLETE
- [x] Conversation summary generation (`services/conversationMemory.ts`)
- [x] Summary storage & retrieval (database table)
- [x] Goal system (create, track, complete) (`services/goalSystem.ts`)
- [x] Subject recommendations engine (`services/recommendationSystem.ts`)

#### Week 3: Growth System Completion ✅ COMPLETE
- [x] Agentic actions (simplified)
  - Auto "Beat-My-Skill" challenge (`services/challengeGenerator.ts`)
  - Streak rescue
- [x] Presence UI (activity feed) (`components/unified/ActivityFeedContent.tsx`)
- [x] Challenge system database & API
- [x] Smart nudges service (`services/nudgeService.ts`, `/api/v2/nudges`)

#### Week 4: Integration & Polish ✅ COMPLETE
- [x] v2 API architecture (XP, Streak, Problems)
- [x] Database migrations (nudges, conversation_summaries)
- [x] Share card generation (`components/ShareCard.tsx`, `services/shareService.ts`)
- [x] End-to-end testing (`__tests__/api/v2-apis.test.ts`, `__tests__/services/services.test.ts`)
- [x] UI/UX polish (loading states, error handling in `ProblemProgress.tsx`, `XPContent.tsx`)
- [x] Documentation (`docs/API.md`)

### Phase 2: Advanced Features (8 weeks)

#### Weeks 5-6: Advanced Study Companion
- [ ] Adaptive practice assignments
- [ ] Re-engagement nudges
- [ ] Multi-goal tracking
- [ ] Learning path recommendations

#### Weeks 7-8: Advanced Growth
- [ ] Full MCP agent system (optional)
- [ ] Session transcription (optional)
- [ ] Advanced analytics
- [ ] A/B testing framework

#### Weeks 9-10: Social Features
- [ ] Friend system
- [ ] Study groups
- [ ] Collaborative challenges
- [ ] Social leaderboards

#### Weeks 11-12: Polish & Scale
- [ ] Performance optimization
- [ ] Mobile app (PWA enhancement)
- [ ] Analytics dashboard
- [ ] Production hardening

---

## Risk & Compliance

### Privacy
- COPPA/FERPA compliance for minors
- Parental consent for sharing
- Data minimization
- Clear privacy controls

### Abuse Prevention
- Rate limiting on referrals/challenges
- Duplicate device/email checks
- Spam detection
- Report/undo functionality

### Technical Risks
- Database performance with new tables
- API rate limits
- Attribution accuracy
- Deep link reliability

---

## Future Enhancements (Phase 2+)

- Advanced viral loops (watch parties, clubs)
- Tutor advocacy system
- Multi-touch attribution
- Advanced analytics
- A/B testing framework
- Push notifications
- SMS integration
- Advanced personalization

---

## Acceptance Criteria

### Phase 1 Complete When:
- [ ] ≥ 4 viral features working (share, referral, challenge, leaderboard)
- [ ] ≥ 4 study companion features working (memory, goals, practice, nudges)
- [ ] K-factor ≥ 0.5 for test cohort
- [ ] Deep link conversion ≥ 20%
- [ ] All features tested and documented
- [ ] Analytics dashboard showing metrics
- [ ] Privacy/compliance memo approved

---

**Document Owner**: Development Team  
**Last Updated**: November 2025  
**Next Review**: After Phase 1 completion

