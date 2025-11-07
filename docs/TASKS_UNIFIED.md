# Unified Implementation Tasks
## Phase-Based Task List for Ecosystem Platform

**Version**: 3.0 (Unified Ecosystem)  
**Date**: November 2025  
**Status**: Phase 1 - Ecosystem Cohesion

---

## Phase 0: Foundation ✅ (Complete)

- [x] Core tutoring system
- [x] User authentication (Model B)
- [x] Student profiles
- [x] Basic gamification (XP, streaks)
- [x] Database setup (Supabase)
- [x] PWA support
- [x] Basic referral system
- [x] Share cards & deep links

---

## Phase 1: Ecosystem Cohesion (4 weeks)

### Week 1: Event System & Orchestration

#### Day 1-2: Event Bus
- [ ] Create `lib/eventBus.ts`
  - [ ] Event type definitions
  - [ ] EventBus class with emit/on/off
  - [ ] TypeScript interfaces
  - [ ] Unit tests

- [ ] Create `types/events.ts`
  - [ ] Event type union
  - [ ] Event interface
  - [ ] Event data types

#### Day 3-4: Orchestrator Service
- [ ] Create `services/orchestrator.ts`
  - [ ] EcosystemOrchestrator class
  - [ ] onProblemCompleted method
  - [ ] onGoalAchieved method
  - [ ] onStreakAtRisk method
  - [ ] Error handling

- [ ] Integration with existing services
  - [ ] Connect to challengeService
  - [ ] Connect to shareService
  - [ ] Connect to conversationSummaryService
  - [ ] Connect to goalService

#### Day 5: Integration & Testing
- [ ] Integrate event bus into API routes
  - [ ] Update `/api/chat` to emit events
  - [ ] Update `/api/session` to emit events
  - [ ] Test event flow

- [ ] End-to-end testing
  - [ ] Problem completion triggers events
  - [ ] Events trigger orchestrator
  - [ ] Orchestrator calls services
  - [ ] UI updates from events

---

### Week 2: Study Companion Core

#### Day 1-2: Conversation Summaries
- [ ] Database migration
  - [ ] Create `conversation_summaries` table
  - [ ] Add indexes
  - [ ] Add RLS policies

- [ ] Create `services/conversationSummaryService.ts`
  - [ ] summarizeSession function
  - [ ] getSummaries function
  - [ ] Integration with OpenAI for summarization
  - [ ] Store summaries in database

- [ ] API route: `/api/companion/memory/summarize`
  - [ ] POST endpoint
  - [ ] Authentication check
  - [ ] Call summary service
  - [ ] Return summary

- [ ] API route: `/api/companion/memory/summaries`
  - [ ] GET endpoint
  - [ ] Fetch user summaries
  - [ ] Filter by profile
  - [ ] Return list

#### Day 3-4: Goal System
- [ ] Database migration
  - [ ] Create `learning_goals` table
  - [ ] Add indexes
  - [ ] Add RLS policies

- [ ] Create `services/goalService.ts`
  - [ ] createGoal function
  - [ ] updateGoal function
  - [ ] completeGoal function
  - [ ] getGoals function
  - [ ] checkGoalProgress function

- [ ] API routes: `/api/companion/goals`
  - [ ] POST - Create goal
  - [ ] GET - List goals
  - [ ] PUT - Update goal
  - [ ] DELETE - Delete goal
  - [ ] POST /goals/[id]/complete - Complete goal

- [ ] Create `components/companion/GoalManager.tsx`
  - [ ] Goal creation form
  - [ ] Goal list display
  - [ ] Goal progress tracking
  - [ ] Goal completion UI

#### Day 5: Subject Recommendations
- [ ] Create `services/recommendationService.ts`
  - [ ] getRelatedSubjects function
  - [ ] Subject mapping logic
  - [ ] Integration with goal completion
  - [ ] Return recommendations

- [ ] API route: `/api/companion/recommendations`
  - [ ] GET endpoint
  - [ ] Accept goal ID or subject
  - [ ] Return recommendations
  - [ ] Cache recommendations

- [ ] Update GoalManager component
  - [ ] Show recommendations on goal completion
  - [ ] Allow creating new goal from recommendation
  - [ ] UI for recommendations

---

### Week 3: Growth System Completion

#### Day 1-2: Agentic Actions (Simplified)
- [ ] Create `services/challengeService.ts`
  - [ ] generateChallenge function (auto "Beat-My-Skill")
  - [ ] createChallenge function
  - [ ] acceptChallenge function
  - [ ] completeChallenge function

- [ ] Database migration
  - [ ] Create `challenges` table
  - [ ] Add indexes
  - [ ] Add RLS policies

- [ ] API routes: `/api/growth/challenge`
  - [ ] POST /create - Create challenge
  - [ ] POST /accept - Accept challenge
  - [ ] POST /complete - Complete challenge
  - [ ] GET /list - List challenges

- [ ] Integrate with orchestrator
  - [ ] Auto-generate challenge on problem completion
  - [ ] Create share link automatically
  - [ ] Emit challenge_created event

#### Day 3: Streak Rescue
- [ ] Create `services/streakRescueService.ts`
  - [ ] detectStreakAtRisk function
  - [ ] createStreakRescueChallenge function
  - [ ] Integration with challenge service

- [ ] Update orchestrator
  - [ ] Check streak status
  - [ ] Trigger streak rescue if needed
  - [ ] Create rescue challenge

- [ ] UI component: `components/growth/StreakRescue.tsx`
  - [ ] Show rescue prompt
  - [ ] Create challenge button
  - [ ] Share link display

#### Day 4: Presence UI
- [ ] Database migration
  - [ ] Create `activity_feed` table
  - [ ] Add indexes
  - [ ] Add RLS policies

- [ ] Create `services/presenceService.ts`
  - [ ] addActivity function
  - [ ] getActivityFeed function
  - [ ] getPresenceCount function (mock for now)

- [ ] API route: `/api/growth/presence/feed`
  - [ ] GET endpoint
  - [ ] Fetch activity feed
  - [ ] Filter by user/profile
  - [ ] Return activities

- [ ] Create `components/growth/PresenceIndicator.tsx`
  - [ ] Show "X peers practicing now"
  - [ ] Activity feed display
  - [ ] Real-time updates (polling)

#### Day 5: Integration
- [ ] Integrate all growth features
- [ ] Test end-to-end flow
- [ ] UI polish
- [ ] Error handling

---

### Week 4: Integration & Polish

#### Day 1-2: End-to-End Testing
- [ ] Test complete user journey
  - [ ] Sign up → Create profile
  - [ ] Set goal → Solve problem
  - [ ] Problem completion → Challenge + Share + Summary
  - [ ] Goal completion → Recommendations
  - [ ] Share link → Friend signs up

- [ ] Fix integration issues
- [ ] Performance testing
- [ ] Error handling improvements

#### Day 3: UI/UX Polish
- [ ] Unified design system
- [ ] Component consistency
- [ ] Mobile responsiveness
- [ ] Loading states
- [ ] Error states

#### Day 4: Documentation
- [ ] Update README
- [ ] API documentation
- [ ] Component documentation
- [ ] Architecture diagrams

#### Day 5: Final Testing & Prep
- [ ] Final bug fixes
- [ ] Performance optimization
- [ ] Security review
- [ ] Demo preparation

---

## Phase 2: Advanced Features (8 weeks)

### Weeks 5-6: Advanced Study Companion

- [ ] Adaptive practice assignments
  - [ ] Database: `practice_assignments` table
  - [ ] Service: `practiceService.ts`
  - [ ] API routes
  - [ ] UI components

- [ ] Re-engagement nudges
  - [ ] Service: `reEngagementService.ts`
  - [ ] Background job detection
  - [ ] Notification system
  - [ ] UI for nudges

- [ ] Multi-goal tracking
  - [ ] Update goal system
  - [ ] Dashboard for multiple goals
  - [ ] Progress visualization

- [ ] Learning path recommendations
  - [ ] Path generation algorithm
  - [ ] UI for learning paths
  - [ ] Progress tracking

### Weeks 7-8: Advanced Growth

- [ ] Full MCP agent system (optional)
  - [ ] Agent architecture
  - [ ] MCP server setup
  - [ ] Agent communication

- [ ] Session transcription (optional)
  - [ ] Transcription service
  - [ ] Summary generation
  - [ ] Agentic action triggers

- [ ] Advanced analytics
  - [ ] Analytics dashboard
  - [ ] K-factor calculation
  - [ ] Conversion tracking

- [ ] A/B testing framework
  - [ ] Experiment setup
  - [ ] Traffic allocation
  - [ ] Results tracking

### Weeks 9-10: Social Features

- [ ] Friend system
  - [ ] Database: `friends` table
  - [ ] Friend requests
  - [ ] Friend list

- [ ] Study groups
  - [ ] Group creation
  - [ ] Group challenges
  - [ ] Group leaderboards

- [ ] Collaborative challenges
  - [ ] Multi-user challenges
  - [ ] Team competitions

- [ ] Social leaderboards
  - [ ] Friend-only leaderboards
  - [ ] Group leaderboards

### Weeks 11-12: Polish & Scale

- [ ] Performance optimization
  - [ ] Database query optimization
  - [ ] Caching strategy
  - [ ] CDN setup

- [ ] Mobile app (PWA enhancement)
  - [ ] Offline support
  - [ ] Push notifications
  - [ ] App store optimization

- [ ] Analytics dashboard
  - [ ] Admin dashboard
  - [ ] User analytics
  - [ ] Growth metrics

- [ ] Production hardening
  - [ ] Security audit
  - [ ] Load testing
  - [ ] Monitoring setup
  - [ ] Backup strategy

---

## Task Dependencies

### Critical Path
1. Event Bus → Orchestrator → All integrations
2. Database migrations → Services → API routes → UI
3. Study Companion core → Advanced features
4. Growth core → Advanced features

### Parallel Work
- Event bus and orchestrator can be built in parallel with database migrations
- UI components can be built in parallel with API routes
- Testing can happen continuously

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Event system working end-to-end
- [ ] Orchestrator coordinating all systems
- [ ] Conversation summaries generated and stored
- [ ] Goal system fully functional
- [ ] Subject recommendations working
- [ ] Auto "Beat-My-Skill" challenges generated
- [ ] Streak rescue working
- [ ] Presence UI showing activity
- [ ] All features integrated and tested
- [ ] Documentation complete

---

**Last Updated**: November 2025  
**Next Review**: After Phase 1 completion

