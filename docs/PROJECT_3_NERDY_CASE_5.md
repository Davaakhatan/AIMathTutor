# Project 3: Nerdy Case 5
## 48-Hour AI Product Sprint

**Project Type**: AI Product Sprint  
**Timeline**: 48 Hours  
**Status**: 📋 **NOT STARTED** (Planned for Phase 1)  
**Date**: November 2025

---

## Executive Summary

**The Challenge**: Choose ONE of these urgent Nerdy problems and build a complete solution using AI-first development in 48 hours.

---

## Three Options

### Option A: AI Study Companion ⭐ (Selected)
Build a persistent AI companion that lives between tutoring sessions, remembers previous lessons, assigns adaptive practice, answers questions conversationally, and drives students back to human tutors when needed. Must integrate with existing session recordings and generate measurable learning improvements.

### Option B: Tutor Quality Scoring System
Create an automated system that evaluates tutor performance across every session, identifies coaching opportunities, predicts which tutors will churn, and recommends interventions. The system must process 3,000 daily sessions and provide actionable insights within 1 hour of session completion.

### Option C: Intelligent Operations Dashboard
Build a real-time command center that monitors marketplace health, predicts supply/demand imbalances, automatically adjusts tutor recruiting campaigns, and alerts operators to anomalies. Must handle 50+ data streams and provide explainable AI recommendations.

---

## Option A: AI Study Companion (Selected)

### Core Objective

Build a **persistent AI companion** that:
- Lives between tutoring sessions
- Remembers previous lessons
- Assigns adaptive practice
- Answers questions conversationally
- Drives students back to human tutors when needed
- Integrates with existing session recordings
- Generates measurable learning improvements

---

## Retention Enhancement Requirements

### 1. Goal Completion → Related Subjects
**Problem**: 52% "goal achieved" churn

**Solution**:
- When student completes goal → **must suggest related subjects**
- **SAT complete** → surface college essays, study skills, AP prep
- **Chemistry** → suggest physics, STEM subjects
- **Algebra** → suggest geometry, advanced math
- Prevent churn by showing "what's next"

### 2. Early Engagement Nudges
**Problem**: Students with <3 sessions by Day 7 churn early

**Solution**:
- Detect students with <3 sessions by Day 7
- Nudge to book next session
- Personalized messages based on:
  - Last activity
  - Learning goals
  - Weak areas
  - Streak status

### 3. Multi-Goal Progress Tracking
**Problem**: Single-subject focus limits engagement

**Solution**:
- Show multi-goal progress tracking (not just single subject)
- Dashboard showing all active goals
- Progress visualization across goals
- Goal interdependencies

---

## Core Features

### 1. Persistent Memory

**Goal**: AI remembers previous sessions and references past learning

**Features**:
- Store conversation summaries in database
- Load context on new sessions
- Reference previous problems/concepts
- Adaptive suggestions based on history
- Cross-session continuity

**Implementation**:
- Database table: `conversation_summaries`
  - `user_id`, `session_id`, `summary`, `concepts_covered`, `difficulty_level`, `created_at`
- Update `services/contextManager.ts` to:
  - Save summaries after sessions
  - Load relevant summaries on new sessions
  - Include in prompt context
- API route: `app/api/summaries/route.ts`

**Success Metrics**:
- Context retention: >80% of users see relevant references
- Engagement: +20% session length with memory
- User satisfaction: Higher ratings for personalized experience

---

### 2. Goal-Based Learning Paths

**Goal**: Help students set and track learning goals

**Features**:
- Goal creation (e.g., "Master Algebra", "Prepare for SAT")
- Goal progress tracking
- **Related subject suggestions after goal completion**
  - SAT complete → suggest college essays, AP prep
  - Chemistry → suggest physics, STEM subjects
  - Algebra → suggest geometry, advanced math
- **Multi-goal progress dashboard**
- Goal-based problem recommendations

**Implementation**:
- Database table: `learning_goals`
  - `user_id`, `student_profile_id`, `goal_type`, `target_subject`, `target_date`, `status`, `progress`, `created_at`
- `components/LearningGoals.tsx` - Goal management UI
- `services/goalService.ts` - Goal logic
- **Subject recommendation engine** (critical for churn reduction)
- API route: `app/api/goals/route.ts`

**Goal Types**:
- `subject_mastery`: Master a specific subject
- `exam_prep`: Prepare for standardized test
- `skill_building`: Build specific skills
- `grade_improvement`: Improve grade in class

**Success Metrics**:
- Goal completion rate: >60%
- **Related subject engagement: >40% after goal completion** (churn reduction)
- **Churn reduction: -20% "goal achieved" churn**

---

### 3. Adaptive Practice Suggestions

**Goal**: AI assigns practice based on performance

**Features**:
- AI-generated practice decks
- Spaced repetition system
- Mastery-based progression
- Weak area focus
- Automatic assignment after sessions

**Implementation**:
- Enhance existing `components/AdaptiveProblemSuggestions.tsx`
- Database table: `practice_assignments`
  - `user_id`, `student_profile_id`, `problem_ids`, `due_date`, `completed`, `mastery_score`, `created_at`
- Spaced repetition algorithm
- Mastery tracking
- API route: `app/api/practice/route.ts`

**Practice Generation Logic**:
1. Analyze recent performance
2. Identify weak areas
3. Generate practice problems
4. Schedule based on spaced repetition
5. Track completion and mastery

**Success Metrics**:
- Practice completion rate: >70%
- Mastery improvement: +25% concept mastery
- Retention: +15% D7 retention for users with practice

---

### 4. Re-engagement Nudges

**Goal**: Bring back inactive users

**Features**:
- **Detect users with <3 sessions by Day 7** (critical requirement)
- Send personalized nudge:
  - "You're doing great! Ready for your next challenge?"
  - Suggest related problem
  - Offer streak shield
- In-app notifications
- Email notifications (optional)
- SMS notifications (optional, future)

**Implementation**:
- Background job to detect inactive users
- `services/reEngagementService.ts` - Nudge logic
- Notification system
- Personalization based on:
  - Last activity
  - Learning goals
  - Weak areas
  - Streak status
- API route: `app/api/nudges/route.ts`

**Nudge Types**:
- **Streak Rescue**: "Your streak is at risk! Come back to keep it going."
- **Goal Reminder**: "You're 80% to your goal! Keep going!"
- **New Challenge**: "New problem type unlocked! Try it now."
- **Friend Activity**: "Your friend just completed a challenge!"
- **Early Engagement**: "You've only done 2 sessions! Book your next one now."

**Success Metrics**:
- Nudge response rate: >30%
- Re-engagement: +25% return rate for nudged users
- **Churn reduction: -15% early churn**

---

## Sprint Requirements

### First 24 Hours
- **Use only AI coding assistants** (no manual coding)
- Rapid prototyping
- AI-first development approach
- Focus on core functionality

### Hour 24-36
- **Refine and debug** with mixed approach
- Manual fixes for critical issues
- Integration testing
- Performance optimization

### Hour 36-48
- **Production hardening** and documentation
- Error handling
- Edge cases
- Deployment preparation

### Must Include
- **Working demo**, not just designs
- **Solution must integrate** with existing Rails/React platform
- Actual functionality, not mockups

---

## Deliverables

### 1. Working Prototype
- Deployed to cloud (AWS or Vercel)
- Functional end-to-end
- Integrates with existing platform
- Not just designs - actual working code

### 2. Documentation
- **AI tools used** and prompting strategies
- Development approach
- Architecture decisions
- Integration points

### 3. Demo Video
- **5-minute demo** showing actual functionality
- Walkthrough of key features
- Real user flows
- Metrics demonstration

### 4. Cost Analysis
- Production deployment costs
- Infrastructure requirements
- Scaling considerations
- ROI projections

### 5. 90-Day Roadmap
- Full implementation plan
- Feature prioritization
- Success metrics
- Milestones and timelines

---

## Success Metrics

### Primary Questions
- ✅ **Does it solve a real business problem?**
  - Addresses 52% "goal achieved" churn
  - Reduces early churn (<3 sessions by Day 7)
  - Improves retention through multi-goal tracking

- ✅ **Could this ship to production within 2 weeks?**
  - Prototype must be production-ready
  - Clear path to full implementation
  - Technical feasibility demonstrated

- ✅ **Does it leverage AI in sophisticated ways?**
  - Conversation summarization
  - Adaptive practice generation
  - Personalized nudges
  - Subject recommendation engine

- ✅ **Clear path to ROI within 90 days?**
  - Measurable retention improvements
  - Cost-benefit analysis
  - Implementation roadmap

### Quantitative Metrics
- **Memory Usage**: ≥ 80% of users see relevant references
- **Goal Completion**: ≥ 60% of goals completed
- **Related Subject Engagement**: ≥ 40% after goal completion
- **Practice Engagement**: ≥ 70% completion rate
- **Re-engagement**: ≥ 30% response rate to nudges
- **Churn Reduction**: -20% "goal achieved" churn, -15% early churn

---

## Technical Architecture

### Database Schema

```sql
-- Conversation Summaries
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  session_id UUID REFERENCES sessions(id),
  summary TEXT,
  concepts_covered TEXT[],
  difficulty_level VARCHAR(20),
  problem_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Goals
CREATE TABLE learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  goal_type VARCHAR(50), -- 'subject_mastery', 'exam_prep', 'skill_building'
  target_subject TEXT,
  target_date DATE,
  status VARCHAR(20), -- 'active', 'completed', 'paused', 'abandoned'
  progress INTEGER DEFAULT 0, -- 0-100
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practice Assignments
CREATE TABLE practice_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  problem_ids UUID[],
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  mastery_score INTEGER DEFAULT 0, -- 0-100
  spaced_repetition_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-engagement Tracking
CREATE TABLE reengagement_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  nudge_type VARCHAR(50),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_action VARCHAR(50), -- 'opened_app', 'solved_problem', 'ignored'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subject Recommendations (for churn reduction)
CREATE TABLE subject_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  completed_goal_id UUID REFERENCES learning_goals(id),
  recommended_subject TEXT,
  recommendation_reason TEXT,
  shown_at TIMESTAMPTZ,
  engaged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Service Architecture

```
services/
  conversationSummaryService.ts - Summary management
  goalService.ts - Goal management
  practiceService.ts - Practice assignment
  reEngagementService.ts - Re-engagement logic
  subjectRecommendationService.ts - Subject suggestions (CRITICAL for churn reduction)
```

### API Routes

```
POST /api/summaries - Create conversation summary
GET /api/summaries - Get user summaries
POST /api/goals - Create/update goal
GET /api/goals - Get user goals
POST /api/goals/:id/complete - Mark goal complete (triggers subject recommendations)
GET /api/subject-recommendations - Get recommended subjects
POST /api/practice/assign - Assign practice
GET /api/practice - Get practice assignments
POST /api/practice/complete - Mark practice complete
POST /api/nudges/send - Send re-engagement nudge
GET /api/nudges - Get nudge history
```

---

## Implementation Plan (48 Hours)

### Hour 0-12: Foundation
- Database schema setup
- Basic conversation summary service
- Goal creation UI
- Practice assignment logic

### Hour 12-24: Core Features
- Conversation memory integration
- Goal tracking and progress
- Practice generation
- Early engagement detection

### Hour 24-36: Critical Features
- **Subject recommendation engine** (churn reduction)
- **Multi-goal dashboard**
- **Re-engagement nudge system**
- Integration testing

### Hour 36-48: Polish & Deploy
- UI/UX improvements
- Error handling
- Documentation
- Demo preparation
- Deployment

---

## Critical Success Factors

### 1. Subject Recommendations (Churn Reduction)
- **Must trigger** when goal completes
- **Must suggest** related subjects immediately
- **Must track** engagement with recommendations
- **Must measure** churn reduction impact

### 2. Early Engagement Nudges
- **Must detect** <3 sessions by Day 7
- **Must personalize** nudge content
- **Must track** response rates
- **Must measure** churn reduction

### 3. Multi-Goal Tracking
- **Must show** all active goals
- **Must visualize** progress across goals
- **Must prevent** single-subject churn

---

## Integration with Existing Platform

### Must Integrate With
- Existing Rails/React platform
- Session recordings
- User authentication
- Student profiles
- Tutoring sessions

### Integration Points
- Session completion → Generate summary
- Summary → Trigger agentic actions
- Goal completion → Subject recommendations
- Practice completion → Update mastery
- Inactivity detection → Send nudge

---

## Current Status

### 📋 Not Started
- All features planned but not implemented
- Database schema designed but not created
- Services architected but not built
- UI components designed but not created

### Dependencies
- ✅ Core AI tutoring (DONE)
- ✅ User authentication (DONE)
- ✅ Student profiles (DONE)
- ⏳ Session storage (needs enhancement for summaries)

---

## Next Steps

### Immediate (48-Hour Sprint)
1. Choose AI tools for development
2. Set up database schema
3. Build conversation summary service
4. Create goal system with subject recommendations
5. Implement re-engagement detection
6. Test end-to-end flows

### Post-Sprint (90-Day Roadmap)
1. Refine based on feedback
2. Scale to production
3. Measure retention improvements
4. Optimize subject recommendations
5. Expand nudge personalization

---

## Notes

**Key Insight**: The study companion transforms the app from a **tool** into a **relationship**. Users feel the AI "knows" them and cares about their progress.

**Critical Success Factor**: The **subject recommendation engine** is the most important feature for churn reduction. When a student completes a goal, immediately showing "what's next" prevents the 52% "goal achieved" churn.

**Warning**: The 48-hour timeline is aggressive. Focus on:
1. Conversation summaries (foundation)
2. Goal system with subject recommendations (churn reduction)
3. Early engagement detection (churn reduction)
4. Practice assignments (engagement)

Skip or simplify:
- Advanced spaced repetition (can add later)
- Complex nudge personalization (start simple)
- Multi-goal visualization (can be basic)

---

## Comparison with Other Options

### Why Option A Was Selected
- ✅ Directly addresses retention problems
- ✅ Builds on existing AI tutoring foundation
- ✅ Clear path to ROI (churn reduction)
- ✅ Integrates naturally with current platform
- ✅ Measurable success metrics

### Option B: Tutor Quality Scoring (Not Selected)
- Focuses on tutor performance, not student retention
- Requires access to 3,000 daily sessions
- More complex data processing requirements
- Less directly related to current platform

### Option C: Operations Dashboard (Not Selected)
- Focuses on operations, not student experience
- Requires 50+ data streams
- More infrastructure-heavy
- Less AI-focused
