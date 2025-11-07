# Product Requirements Document (PRD)
## AI Math Tutor - Enhanced with Viral Growth & Study Companion

**Version**: 2.0  
**Date**: November 2025  
**Status**: Active Development

---

## Executive Summary

This PRD outlines the enhanced AI Math Tutor platform that combines:
1. **Core AI Tutoring** - Socratic method-based math tutoring (✅ Complete)
2. **Viral Growth System** - Social features and referral mechanics (🚧 Phase 1)
3. **AI Study Companion** - Persistent learning companion with memory (🚧 Phase 1)

---

## Product Vision

Transform the AI Math Tutor into a **social, engaging learning platform** that:
- Helps students learn math through Socratic questioning
- Encourages social learning through challenges and sharing
- Provides persistent AI companion that remembers and adapts
- Drives organic growth through viral mechanics

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

## Technical Architecture

### Database Schema Additions

```sql
-- Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id),
  referee_id UUID REFERENCES auth.users(id),
  status TEXT, -- 'pending', 'completed', 'rewarded'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID REFERENCES auth.users(id),
  challengee_id UUID REFERENCES auth.users(id),
  problem_id UUID REFERENCES problems(id),
  status TEXT, -- 'pending', 'accepted', 'completed', 'expired'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation Summaries
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES sessions(id),
  summary TEXT,
  concepts_covered TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Learning Goals
CREATE TABLE learning_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  goal_type TEXT, -- 'subject_mastery', 'exam_prep', 'skill_building'
  target_subject TEXT,
  target_date DATE,
  status TEXT, -- 'active', 'completed', 'paused'
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Practice Assignments
CREATE TABLE practice_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  problem_ids UUID[],
  due_date TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Routes

```
POST /api/share/generate - Generate share card
GET /api/deep-link/:code - Handle deep link
POST /api/referral/create - Create referral link
GET /api/referral/stats - Get referral stats
POST /api/challenge/create - Create challenge
POST /api/challenge/accept - Accept challenge
GET /api/summaries - Get conversation summaries
POST /api/goals - Create/update goal
GET /api/goals - Get user goals
POST /api/practice/assign - Assign practice
GET /api/practice - Get practice assignments
POST /api/nudges/send - Send re-engagement nudge
```

### Services

```
services/
  referralService.ts - Referral logic
  challengeService.ts - Challenge logic
  shareService.ts - Share card generation
  goalService.ts - Goal management
  practiceService.ts - Practice assignment
  reEngagementService.ts - Re-engagement logic
  conversationSummaryService.ts - Summary management
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

## Implementation Roadmap

### Week 1-2: Foundation
- [ ] Database schema updates
- [ ] Basic referral system
- [ ] Share card generation
- [ ] Deep link routing

### Week 3-4: Social Features
- [ ] Challenge system
- [ ] Enhanced leaderboards
- [ ] Friend connections (basic)

### Week 5-6: Study Companion
- [ ] Conversation summaries
- [ ] Goal system
- [ ] Practice assignments
- [ ] Re-engagement nudges

### Week 7-8: Polish & Testing
- [ ] UI/UX improvements
- [ ] Analytics dashboard
- [ ] Testing & bug fixes
- [ ] Documentation

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

