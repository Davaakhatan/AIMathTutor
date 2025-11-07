# Project 3: Nerdy Case 5 - AI Study Companion
## 48-Hour AI Product Sprint

**Project Type**: AI Product Sprint  
**Timeline**: 48 Hours  
**Status**: 📋 **NOT STARTED** (Planned for Phase 1)  
**Date**: November 2025

---

## Executive Summary

Build an **AI study companion** that provides persistent memory, goal-based learning paths, adaptive practice suggestions, and re-engagement nudges. This transforms the one-time tutoring session into a **long-term learning relationship**.

---

## Core Objective

Create an AI companion that:
- **Remembers** previous sessions and learning history
- **Adapts** to student goals and learning style
- **Suggests** relevant practice and next steps
- **Re-engages** inactive users with personalized nudges
- **Tracks** progress toward learning goals

---

## Success Criteria

### Primary Goals
- **Memory Usage**: ≥ 80% of users see relevant references to past learning
- **Goal Completion**: ≥ 60% of goals completed
- **Practice Engagement**: ≥ 70% completion rate for assigned practice
- **Re-engagement**: ≥ 30% response rate to nudges

### Secondary Goals
- **Retention**: +10% D7 retention for users with study companion features
- **Churn Reduction**: -20% "goal achieved" churn, -15% early churn
- **Engagement**: +15% problems solved for users with active goals

---

## Key Requirements

### 1. Persistent Conversation Memory

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
- Related subject suggestions after goal completion
  - SAT complete → suggest college essays, AP prep
  - Chemistry → suggest physics, STEM subjects
- Multi-goal progress dashboard
- Goal-based problem recommendations

**Implementation**:
- Database table: `learning_goals`
  - `user_id`, `student_profile_id`, `goal_type`, `target_subject`, `target_date`, `status`, `progress`, `created_at`
- `components/LearningGoals.tsx` - Goal management UI
- `services/goalService.ts` - Goal logic
- Subject recommendation engine
- API route: `app/api/goals/route.ts`

**Goal Types**:
- `subject_mastery`: Master a specific subject
- `exam_prep`: Prepare for standardized test
- `skill_building`: Build specific skills
- `grade_improvement`: Improve grade in class

**Success Metrics**:
- Goal completion rate: >60%
- Related subject engagement: >40% after goal completion
- Churn reduction: -20% "goal achieved" churn

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
- Detect users with <3 sessions by Day 7
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

**Success Metrics**:
- Nudge response rate: >30%
- Re-engagement: +25% return rate for nudged users
- Churn reduction: -15% early churn

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
```

### Service Architecture

```
services/
  conversationSummaryService.ts - Summary management
  goalService.ts - Goal management
  practiceService.ts - Practice assignment
  reEngagementService.ts - Re-engagement logic
  subjectRecommendationService.ts - Subject suggestions
```

### API Routes

```
POST /api/summaries - Create conversation summary
GET /api/summaries - Get user summaries
POST /api/goals - Create/update goal
GET /api/goals - Get user goals
POST /api/practice/assign - Assign practice
GET /api/practice - Get practice assignments
POST /api/practice/complete - Mark practice complete
POST /api/nudges/send - Send re-engagement nudge
GET /api/nudges - Get nudge history
```

---

## Implementation Plan

### Week 1: Conversation Memory (Days 1-2)
- Database schema setup
- Summary generation after sessions
- Summary loading on new sessions
- Context integration in prompts
- Testing with real conversations

### Week 2: Goal System (Days 3-4)
- Goal creation UI
- Goal tracking
- Progress calculation
- Subject recommendations
- Goal completion flow

### Week 3: Practice System (Days 5-6)
- Practice assignment algorithm
- Spaced repetition logic
- Mastery tracking
- Practice completion UI
- Performance analysis

### Week 4: Re-engagement (Days 7-8)
- Inactivity detection
- Nudge generation
- Notification system
- Response tracking
- A/B testing different nudge types

---

## User Experience Flow

### First-Time User
1. Complete first problem
2. System suggests: "Set a learning goal?"
3. User creates goal: "Master Algebra"
4. System: "Great! I'll track your progress."

### Returning User
1. User opens app
2. System: "Welcome back! Last time we worked on quadratic equations. Ready to continue?"
3. Shows progress toward goals
4. Suggests practice based on weak areas

### Inactive User (Day 7)
1. System detects: <3 sessions
2. Generates personalized nudge
3. "You're 80% to your Algebra goal! One more session to unlock the next level."
4. User returns → System celebrates progress

---

## Success Metrics

### Study Companion Metrics
- **Memory Usage**: ≥ 80% of users see relevant references
- **Goal Completion**: ≥ 60% of goals completed
- **Practice Engagement**: ≥ 70% completion rate
- **Re-engagement**: ≥ 30% response rate to nudges

### Overall Impact
- **Activation**: +20% lift to FVM (First Value Moment)
- **Retention**: +10% D7 retention
- **Engagement**: +15% problems solved
- **Churn Reduction**: -20% "goal achieved" churn, -15% early churn

---

## Integration with Other Projects

### With AI Math Tutor
- Uses conversation data for summaries
- Builds on existing problem-solving flow
- Enhances core tutoring experience

### With K Factor Project
- Goals can be shared (viral growth)
- Practice assignments can be challenges
- Re-engagement nudges can include referral opportunities

---

## Risk & Mitigation

### Technical Risks
- **Summary Quality**: May not capture all context
  - Mitigation: Test with various problem types, iterate on prompt
- **Goal Abandonment**: Users may not complete goals
  - Mitigation: Make goals achievable, celebrate milestones
- **Nudge Fatigue**: Too many nudges = ignored
  - Mitigation: Throttle frequency, personalize content

### Product Risks
- **Complexity**: Too many features = confusion
  - Mitigation: Progressive disclosure, clear UI
- **Privacy**: Storing conversation data
  - Mitigation: Clear privacy policy, user consent

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
- ⏳ Session storage (needs enhancement)

---

## Next Steps

### Immediate (This Week)
1. Review requirements
2. Design database schema
3. Create conversation summary service
4. Test summary generation

### Short Term (Next 2 Weeks)
1. Build goal system
2. Implement practice assignments
3. Create re-engagement detection

### Medium Term (Weeks 3-4)
1. Build UI components
2. Integrate with existing app
3. Test end-to-end flows
4. Measure success metrics

---

## Notes

**Key Insight**: The study companion transforms the app from a **tool** into a **relationship**. Users feel the AI "knows" them and cares about their progress.

**Critical Success Factor**: The features must feel **helpful, not intrusive**. Users should want to use them, not feel forced.

**Warning**: Don't build all features at once. Start with conversation memory (foundation), then goals, then practice, then nudges.

