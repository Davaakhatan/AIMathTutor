# Task List - Enhanced AI Math Tutor

**Status**: Active Development  
**Last Updated**: November 2025

---

## ⚠️ PRE-PHASE 1: Complete Model B UI (MUST DO FIRST)

### Critical: Parent/Teacher Linking UI
- [ ] Create `components/auth/LinkStudentForm.tsx`
  - [ ] Search by student email/username input
  - [ ] Search API endpoint
  - [ ] Display search results
  - [ ] Create relationship button
  - [ ] Error handling
- [ ] Create `components/auth/LinkedStudentsList.tsx`
  - [ ] Display linked students
  - [ ] Show permissions
  - [ ] Unlink button
  - [ ] Empty state

### Critical: Update Existing Components
- [ ] Update `components/auth/ProfileSwitcher.tsx`
  - [ ] Hide for students (they only have one profile)
  - [ ] Show linked students for parents/teachers
  - [ ] Load from `profile_relationships`
- [ ] Update `components/auth/ProfileManager.tsx`
  - [ ] Different UI for students vs parents
  - [ ] Students: Show "My Profile" + "Who Can View"
  - [ ] Parents: Show "Linked Students" + "Link Student" button
- [ ] Update `contexts/AuthContext.tsx`
  - [ ] `loadProfiles()` - Load linked students for parents
  - [ ] `setActiveProfile()` - Handle parent student switching
- [ ] Update `components/auth/UserMenu.tsx`
  - [ ] Show role badge
  - [ ] Different options for students vs parents
- [ ] Update `app/page.tsx`
  - [ ] Show selected student data for parents
  - [ ] Show "No student selected" message

### Testing
- [ ] Test student signup flow
- [ ] Test parent signup flow
- [ ] Test parent linking to student
- [ ] Test parent switching between students
- [ ] Test data isolation
- [ ] Test permissions

**Estimated Time**: 1-2 weeks  
**Status**: ⚠️ **BLOCKING PHASE 1**

---

## Phase 1: Viral Growth Features

### 1. Share Cards & Deep Links
- [ ] Create `components/ShareCard.tsx`
  - [ ] Generate shareable card images
  - [ ] Support multiple card types (achievement, progress, problem)
  - [ ] Include user branding
- [ ] Create `app/api/share/route.ts`
  - [ ] Generate share links with unique codes
  - [ ] Store share metadata in database
- [ ] Create `app/api/deep-link/[code]/route.ts`
  - [ ] Handle deep link routing
  - [ ] Pre-fill problem context
  - [ ] Track attribution
- [ ] Add share buttons to:
  - [ ] Achievement badges
  - [ ] Problem completion screens
  - [ ] Progress dashboard
  - [ ] Streak milestones
- [ ] Create database table: `shares`
- [ ] Add share analytics tracking

### 2. Basic Referral System
- [ ] Create `services/referralService.ts`
  - [ ] Generate unique referral codes
  - [ ] Track referrals
  - [ ] Calculate rewards
- [ ] Create `components/ReferralDashboard.tsx`
  - [ ] Show referral link
  - [ ] Display referral stats
  - [ ] Show rewards earned
- [ ] Create `app/api/referral/route.ts`
  - [ ] Create referral link
  - [ ] Track referral signup
  - [ ] Award rewards
- [ ] Create database table: `referrals`
- [ ] Add referral tracking to signup flow
- [ ] Create reward system (XP, streak shields, AI minutes)

### 3. Enhanced Leaderboards
- [ ] Update `components/Leaderboard.tsx`
  - [ ] Add subject filters
  - [ ] Add time period filters (weekly, monthly)
  - [ ] Add friend-only filter
- [ ] Create database queries for rankings
- [ ] Add real-time updates (polling or SSE)
- [ ] Add privacy controls (opt-in)
- [ ] Create leaderboard analytics

### 4. Challenge System
- [ ] Create `services/challengeService.ts`
  - [ ] Create challenges
  - [ ] Accept challenges
  - [ ] Track completion
  - [ ] Award rewards
- [ ] Create `components/ChallengeCard.tsx`
  - [ ] Display challenge details
  - [ ] Accept/decline UI
  - [ ] Show progress
- [ ] Create `app/api/challenge/route.ts`
  - [ ] Create challenge
  - [ ] Accept challenge
  - [ ] Complete challenge
- [ ] Create database table: `challenges`
- [ ] Add challenge notifications
- [ ] Integrate with problem completion flow

---

## Phase 1: AI Study Companion Features

### 5. Persistent Conversation Memory
- [ ] Create `services/conversationSummaryService.ts`
  - [ ] Generate summaries after sessions
  - [ ] Load relevant summaries
  - [ ] Include in context
- [ ] Update `services/contextManager.ts`
  - [ ] Save summaries after sessions
  - [ ] Load summaries on new sessions
  - [ ] Include in prompt context
- [ ] Create `app/api/summaries/route.ts`
  - [ ] Save summary
  - [ ] Get summaries
  - [ ] Search summaries
- [ ] Create database table: `conversation_summaries`
- [ ] Add summary generation to session end
- [ ] Test memory recall accuracy

### 6. Goal-Based Learning Paths
- [ ] Create `services/goalService.ts`
  - [ ] Create goals
  - [ ] Track progress
  - [ ] Suggest related subjects
- [ ] Create `components/LearningGoals.tsx`
  - [ ] Goal creation form
  - [ ] Goal progress display
  - [ ] Related subject suggestions
- [ ] Create `app/api/goals/route.ts`
  - [ ] Create/update goal
  - [ ] Get user goals
  - [ ] Calculate progress
- [ ] Create database table: `learning_goals`
- [ ] Create subject recommendation engine
- [ ] Add goal completion celebrations
- [ ] Add related subject CTAs

### 7. Adaptive Practice Suggestions
- [ ] Update `components/AdaptiveProblemSuggestions.tsx`
  - [ ] Add practice assignment UI
  - [ ] Show due dates
  - [ ] Track completion
- [ ] Create `services/practiceService.ts`
  - [ ] Generate practice decks
  - [ ] Implement spaced repetition
  - [ ] Track mastery
- [ ] Create `app/api/practice/route.ts`
  - [ ] Assign practice
  - [ ] Get practice assignments
  - [ ] Mark complete
- [ ] Create database table: `practice_assignments`
- [ ] Integrate spaced repetition algorithm
- [ ] Add practice reminders

### 8. Re-engagement Nudges
- [ ] Create `services/reEngagementService.ts`
  - [ ] Detect inactive users
  - [ ] Generate personalized nudges
  - [ ] Track nudge effectiveness
- [ ] Create `app/api/nudges/route.ts`
  - [ ] Send nudge
  - [ ] Track nudge opens
  - [ ] Track nudge responses
- [ ] Create notification system
  - [ ] In-app notifications
  - [ ] Email notifications (optional)
- [ ] Create background job for detection
- [ ] Add nudge analytics

---

## Infrastructure & Database

### Database Schema
- [ ] Create `referrals` table
- [ ] Create `challenges` table
- [ ] Create `conversation_summaries` table
- [ ] Create `learning_goals` table
- [ ] Create `practice_assignments` table
- [ ] Create `shares` table
- [ ] Add RLS policies for all tables
- [ ] Add indexes for performance
- [ ] Create migration scripts

### API Routes
- [ ] `/api/share/generate` - Share card generation
- [ ] `/api/deep-link/[code]` - Deep link handling
- [ ] `/api/referral/*` - Referral endpoints
- [ ] `/api/challenge/*` - Challenge endpoints
- [ ] `/api/summaries/*` - Summary endpoints
- [ ] `/api/goals/*` - Goal endpoints
- [ ] `/api/practice/*` - Practice endpoints
- [ ] `/api/nudges/*` - Nudge endpoints

### Services
- [ ] `referralService.ts`
- [ ] `challengeService.ts`
- [ ] `shareService.ts`
- [ ] `goalService.ts`
- [ ] `practiceService.ts`
- [ ] `reEngagementService.ts`
- [ ] `conversationSummaryService.ts`

---

## UI/UX Updates

### Components
- [ ] Share buttons throughout app
- [ ] Referral dashboard
- [ ] Enhanced leaderboards
- [ ] Challenge cards
- [ ] Goal management UI
- [ ] Practice assignment UI
- [ ] Nudge notifications

### Design
- [ ] Share card templates
- [ ] Referral link UI
- [ ] Challenge flow UI
- [ ] Goal creation flow
- [ ] Practice assignment cards
- [ ] Notification system UI

---

## Analytics & Tracking

### Event Tracking
- [ ] Share events
- [ ] Referral events
- [ ] Challenge events
- [ ] Goal events
- [ ] Practice events
- [ ] Nudge events

### Dashboards
- [ ] Viral metrics dashboard
- [ ] Study companion metrics
- [ ] User engagement metrics
- [ ] Conversion funnels

---

## Testing & Quality

### Unit Tests
- [ ] Service tests
- [ ] API route tests
- [ ] Component tests

### Integration Tests
- [ ] End-to-end flows
- [ ] Database operations
- [ ] API integrations

### User Testing
- [ ] Share flow testing
- [ ] Referral flow testing
- [ ] Challenge flow testing
- [ ] Goal flow testing

---

## Documentation

### Technical Docs
- [ ] API documentation
- [ ] Database schema docs
- [ ] Service documentation
- [ ] Component documentation

### User Docs
- [ ] Feature guides
- [ ] How-to articles
- [ ] FAQ updates

---

## Deployment

### Pre-Deployment
- [ ] Environment variables setup
- [ ] Database migrations
- [ ] Feature flags
- [ ] Monitoring setup

### Deployment
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Rollback plan

### Post-Deployment
- [ ] Monitoring & alerts
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] User feedback collection

---

## Priority Order

### Week 1-2 (High Priority)
1. Share cards & deep links
2. Basic referral system
3. Database schema setup

### Week 3-4 (High Priority)
4. Challenge system
5. Enhanced leaderboards
6. Conversation memory

### Week 5-6 (Medium Priority)
7. Goal system
8. Practice assignments
9. Re-engagement nudges

### Week 7-8 (Polish)
10. UI/UX improvements
11. Analytics dashboard
12. Testing & bug fixes
13. Documentation

---

**Total Tasks**: ~80+  
**Estimated Completion**: 8 weeks  
**Current Status**: Planning Phase

