# Project 2: "The Challenge" - 10× K Factor
## Viral, Gamified, Supercharged Varsity Tutors

**Project Type**: Growth & Marketing Platform  
**Timeline**: Bootcamp Project (Finalized)  
**Status**: 🚧 **PARTIALLY DONE** (Basic features exist, agentic actions pending)  
**Date**: November 2025

---

## Executive Summary

**The Challenge**: Varsity Tutors has rich products (1:1 scheduled tutoring, instant on-demand tutoring, AI tutoring, live classes, diagnostics, practice, flashcards, etc.). Design and implement a **production-ready growth system** that makes learning feel fun, social, and "alive," and that **10×'s viral growth** by turning every touchpoint into a shareable, referable moment—across students, parents, and tutors.

---

## Core Objectives

### Primary Goal
**Ship ≥ 4 closed-loop viral mechanics** that measurably increase K-factor (K = invites per user × invite conversion rate).

### Key Requirements
1. **Make the platform feel alive**: Presence signals, activity feed, mini-leaderboards, and cohort rooms that show "others are learning with you."
2. **Convert async results pages** (diagnostics, practice tests, flashcards, etc.) into powerful viral surfaces with share cards, deep links, and cohort challenges.
3. **Prove lift** with a controlled experiment and a clear analytics plan.

---

## Required Agents (Minimum)

### [Required] Core Agents

**1. Loop Orchestrator Agent**
- Chooses which loop to trigger (after session, badge earned, streak preserved, results page view, etc.)
- Coordinates eligibility & throttling
- Routes to appropriate agent
- **SLA**: <150ms decision time for in-app triggers

**2. Personalization Agent**
- Tailors invites, rewards, and copy by persona (student/parent/tutor)
- Subject-aware personalization
- Intent-based customization
- **Required**: Must include short rationale for auditability

**3. Experimentation Agent**
- Allocates traffic for experiments
- Logs exposures
- Computes K, uplift, and guardrail metrics in real time
- A/B testing framework

### Optional Agents

**4. Incentives & Economy Agent**
- Manages credits/rewards (AI Tutor minutes, class passes, gem/XP boosts)
- Prevents abuse
- Ensures unit economics
- Optimizes reward mix by persona and CAC/LTV

**5. Social Presence Agent**
- Publishes presence ("28 peers practicing Algebra now")
- Recommends cohorts/clubs
- Nudges "invite a friend to join this practice"
- Real-time activity feed

**6. Tutor Advocacy Agent**
- Generates share-packs for tutors (smart links, auto thumbnails, one-tap WhatsApp/SMS)
- Tracks referrals/attribution
- Manages tutor incentives and disclosures

**7. Trust & Safety Agent**
- Fraud detection
- COPPA/FERPA-aware redaction
- Duplicate device/email checks
- Rate-limits
- Report/undo functionality

### Agent Communication
- **Protocol**: Model Context Protocol (MCP) servers
- **Contracts**: JSON-schema contracts
- **Auditability**: Each decision must include a short rationale
- **Failure Mode**: Graceful degradation to default copy/reward if agents are down

---

## Session Intelligence

### Transcription → Agentic Actions → Viral

All live and instant sessions are **transcribed and summarized**. These summaries power agentic actions for students and tutors that also seed viral behaviors.

### Minimum Agentic Actions (Ship ≥ 4 Total)

#### For Students (Ship ≥ 2)

**1. Auto "Beat-My-Skill" Challenge**
- **Trigger**: From session summary's skill gaps
- **Action**: Generate a 5-question micro-deck with a share link to challenge a friend
- **Reward**: Both get streak shields if friend reaches FVM within 48h
- **Attribution**: Referral code embedded in challenge link

**2. Study Buddy Nudge**
- **Trigger**: If summary shows upcoming exam or stuck concept
- **Action**: Create a co-practice invite tied to the exact deck
- **Presence**: Shows "friend joined"
- **Reward**: Both get rewards for co-practice completion

#### For Tutors (Ship ≥ 2)

**1. Parent Progress Reel + Invite**
- **Trigger**: After session or progress update
- **Action**: Auto-compose a privacy-safe 20–30s reel (key moments & wins)
- **Output**: Referral link for the parent to invite another parent for a class pass
- **Reward**: Parents who sign up get class pass, tutor gets referral credit

**2. Next-Session Prep Pack Share**
- **Trigger**: Before next scheduled session
- **Action**: Tutor receives an AI-generated prep pack and a class sampler link
- **Output**: Share with peers/parents
- **Reward**: Joins credit the tutor's referral XP

### Privacy & Compliance
- **COPPA/FERPA Safe**: All actions must be privacy-safe
- **Parental Gating**: Parental consent for minors
- **Clear Consent UX**: Transparent opt-in/opt-out

---

## Core Requirements

### 1. Async Results as Viral Surfaces

Diagnostics, practice tests, and other async tools produce results pages (scores, skills heatmaps, recommendations) that must:

**Share Cards**
- Render privacy-safe share cards for student/parent/tutor variants
- Auto-generated from results data
- Customizable templates

**Challenge CTAs**
- Offer "Challenge a friend / Invite a study buddy" CTAs
- Tied to the exact skill deck/class/AI practice set
- Context-aware invitations

**Deep Links**
- Provide deep links landing new users directly in a bite-size first-value moment
- Example: 5-question skill check
- Pre-fills context from results

**Cohort/Classroom Variants**
- For teachers/tutors to invite groups
- Bulk invitation capabilities
- Classroom leaderboards

### 2. "Alive" Layer

**Presence Signals**
- Presence pings ("28 peers practicing Algebra now")
- "Friends online now" indicators
- Real-time activity updates

**Study Map**
- Visual representation of learning activity
- Geographic or subject-based clustering
- "Others learning near you"

**Mini-Leaderboards**
- Per subject leaderboards
- Time-filtered (today, this week, this month)
- Friend-only options
- Privacy controls

**Cohort Rooms**
- Live subject clubs
- Multi-user practice sessions
- Presence shows "friends joined"

### 3. Instant-Value Rewards

**Credit Types**
- AI Tutor minutes (e.g., 15 minutes)
- Class samplers
- Practice power-ups
- Gem/XP boosts

**Immediate Usability**
- Rewards are instantly usable
- No waiting periods
- Clear value proposition

### 4. Cross-Surface Hooks

**Platforms**
- Web
- Mobile (iOS/Android)
- Email
- Push notifications
- SMS

**Deep Links**
- Prefill context across platforms
- Cross-device continuity
- Attribution tracking

### 5. Analytics

**Event Schema**
- `invites_sent`
- `invite_opened`
- `account_created`
- `FVM_reached` (First Value Moment)
- `retention_D1/D7/D28`
- `LTV_deltas`

**Tracking**
- Attribution: last-touch for join; multi-touch stored for analysis
- Guardrails: complaint rate, opt-outs, latency to FVM, support tickets
- Dashboards: cohort curves, loop funnel drop-offs, LTV deltas

---

## Viral Loop Menu (Pick Any 4+)

**Important**: We are not prescribing which to build. Choose any 4+ that best fit your squad's thesis, and feel free to add original ideas.

### 1. Buddy Challenge (Student → Student)
- **Trigger**: After practice or on results pages
- **Action**: Share a "Beat-my-score" micro-deck
- **Reward**: Both get streak shields if friend reaches FVM
- **Attribution**: Referral code embedded

### 2. Results Rally (Async → Social)
- **Trigger**: Diagnostics/practice results
- **Action**: Generate a rank vs. peers and a challenge link
- **Output**: Cohort leaderboard refreshes in real time
- **Reward**: Top performers get recognition + rewards

### 3. Proud Parent (Parent → Parent)
- **Trigger**: Weekly recap card
- **Action**: Shareable progress reel
- **CTA**: "Invite a parent" for a class pass
- **Reward**: Both parents get class passes

### 4. Tutor Spotlight (Tutor → Family/Peers)
- **Trigger**: After 5★ session
- **Action**: Generate a tutor card + invite link
- **Reward**: Tutor accrues XP/leaderboard perks when joins convert
- **Attribution**: Tutor referral tracking

### 5. Class Watch-Party (Student Host → Friends)
- **Trigger**: Co-watch recorded class
- **Action**: Host invites 1–3 friends
- **Features**: Synced notes, shared viewing
- **Reward**: Guests get class sampler + AI notes

### 6. Streak Rescue (Student → Student)
- **Trigger**: When a streak is at risk
- **Action**: Prompt "Phone-a-friend" to co-practice now
- **Reward**: Both receive streak shields upon completion
- **Urgency**: Time-sensitive invitation

### 7. Subject Clubs (Multi-user)
- **Trigger**: Join a live subject club
- **Action**: Each member gets a unique friend pass
- **Presence**: Shows "friends joined"
- **Reward**: Group rewards for participation

### 8. Achievement Spotlight (Any persona)
- **Trigger**: Auto-generated milestone badges
- **Action**: Convert to social cards (safe by default)
- **Output**: Clickthrough gives newcomers a try-now micro-task
- **Reward**: Achievement unlocker gets referral credit

---

## Technical Specifications

### Agent Architecture
- **Protocol**: MCP (Model Context Protocol) between agents
- **Contracts**: JSON-schema contracts
- **SLA**: <150ms decision time for in-app triggers
- **Explainability**: Each agent logs decision, rationale, features_used

### Performance Requirements
- **Concurrency**: 5k concurrent learners
- **Peak Load**: 50 events/sec orchestrated
- **Latency**: <150ms for agent decisions
- **Availability**: Graceful degradation if agents are down

### Attribution System
- **Smart Links**: Signed smart links (short codes) with UTM
- **Cross-Device**: Continuity across devices
- **Multi-Touch**: Last-touch for join; multi-touch stored for analysis
- **Tracking**: Full attribution path from view → sign-up → FVM

### Data Architecture
- **Event Bus**: Stream processing → warehouse/model store
- **PII Minimization**: Privacy-first data handling
- **Child Data**: Segregated storage for COPPA compliance
- **Real-Time**: Live metrics computation

### Infrastructure
- **Privacy/Compliance**: COPPA/FERPA safe defaults; clear consent flows
- **Security**: Fraud detection, rate limiting, abuse prevention
- **Scalability**: Handle 5k concurrent users, 50 events/sec

---

## Ambiguous Elements (You Must Decide)

### 1. Optimal Reward Mix
- AI minutes vs. gem boosts vs. class passes
- By persona (student/parent/tutor)
- CAC/LTV math optimization

### 2. Fairness in Leaderboards
- New users vs. veterans
- Age bands
- Skill-based vs. time-based rankings

### 3. Spam Thresholds
- Caps on invites/day
- Cool-downs
- School email handling
- Rate limiting strategies

### 4. K-Factor Definition
- Multi-touch joins (view → sign-up → FVM)
- Attribution model (last-touch vs. multi-touch)
- Cohort definition

### 5. Tutor Incentives and Disclosures
- Reward structure for tutors
- Disclosure requirements
- Compliance with educational standards

---

## Success Metrics

### Primary Metrics
- **K-Factor**: Achieve **K ≥ 1.20** for at least one loop over a 14-day cohort
- **Activation**: +20% lift to first-value moment (first correct practice or first AI-Tutor minute)
- **Referral Mix**: Referrals ≥ 30% of new weekly signups (from baseline [__]%)
- **Retention**: +10% D7 retention for referred cohorts
- **Tutor Utilization**: +5% via referral conversion to sessions
- **Satisfaction**: ≥ 4.7/5 CSAT on loop prompts & rewards
- **Abuse**: <0.5% fraudulent joins; <1% opt-out from growth comms

### Analytics Tracking
- **K-factor tracking**: `invites_sent`, `invite_opened`, `account_created`, `FVM_reached`
- **Attribution**: Last-touch for join; multi-touch stored for analysis
- **Guardrails**: Complaint rate, opt-outs, latency to FVM, support tickets
- **Dashboards**: Cohort curves (referred vs. baseline), loop funnel drop-offs, LTV deltas
- **Results-page funnels**: Impressions → share clicks → join → FVM per tool
- **Transcription-action funnels**: Session → summary → agentic action → invite → join → FVM

---

## Deliverables (Bootcamp)

### 1. Thin-Slice Prototype
- Web/mobile prototype
- ≥ 4 working loops
- Live presence UI
- Functional end-to-end flows

### 2. MCP Agent Code
- Agent code (or stubs) for:
  - Orchestrator
  - Personalization
  - Incentives
  - Experimentation
- JSON-schema contracts
- Decision logging with rationale

### 3. Session Transcription + Agentic Actions
- Session transcription system
- Summary generation
- ≥ 4 agentic actions triggered (≥2 tutor, ≥2 student)
- Each feeding viral loops

### 4. Signed Smart Links + Attribution Service
- Smart link generation
- Attribution tracking
- Cross-device continuity
- UTM parameter support

### 5. Event Spec & Dashboards
- Event schema documentation
- K-factor dashboard
- Invites/user metrics
- Conversion funnels
- FVM tracking
- Retention metrics
- Guardrail monitoring

### 6. Copy Kit
- Dynamic templates by persona
- Localized (English + [other language])
- A/B test variants
- Personalization rules

### 7. Risk & Compliance Memo
- 1-pager documentation
- Data flows
- Consent mechanisms
- Gating for minors
- COPPA/FERPA compliance

### 8. Results-Page Share Packs
- Share cards for diagnostics/practice/async tools
- Progress reels
- Deep links
- Cohort challenge CTAs

### 9. Run-of-Show Demo
- 3-minute journey
- Trigger → invite → join → FVM
- Live demonstration
- Metrics visualization

---

## Acceptance Criteria

### Must Have
- ✅ ≥ 4 viral loops functioning end-to-end with MCP agents
- ✅ ≥ 4 agentic actions (≥2 tutor, ≥2 student) triggered from session transcription, each feeding a viral loop
- ✅ Measured K for a seeded cohort and a clear readout (pass/fail vs K ≥ 1.20)
- ✅ Demonstrated presence UI and at least one leaderboard or cohort room
- ✅ Compliance memo approved and results-page sharing active for diagnostics/practice/async tools

### Technical Requirements
- ✅ MCP agents with JSON-schema contracts
- ✅ <150ms decision SLA for in-app triggers
- ✅ Attribution system with smart links
- ✅ Event tracking and analytics dashboards
- ✅ Graceful degradation if agents fail

---

## Current Status

### ✅ Completed
- Basic referral system (codes, tracking, rewards)
- Share cards & deep links (basic implementation)
- Database schema (referrals, referral_codes, shares)
- API routes for referrals and shares
- Referral dashboard UI

### 🚧 In Progress
- Role-based rewards (partially done)
- Share ↔ Referral integration (pending)

### 📋 Not Started
- **MCP Agent System** (all agents)
- **Session Transcription** (transcription + summaries)
- **Agentic Actions** (all 4+ required)
- **Presence UI** (alive layer)
- **Results-Page Sharing** (async tools)
- **Multi-Touchpoint Attribution** (full system)
- **Analytics Dashboards** (K-factor, funnels, etc.)

---

## Implementation Priority

### Phase 1: Foundation (Weeks 1-2)
1. MCP agent infrastructure
2. Session transcription system
3. Basic agentic actions (2 student, 2 tutor)
4. Smart links + attribution

### Phase 2: Viral Loops (Weeks 3-4)
1. Build 4+ viral loops (choose from menu)
2. Presence UI
3. Results-page sharing
4. Analytics tracking

### Phase 3: Optimization (Weeks 5-6)
1. A/B testing framework
2. Reward optimization
3. Performance tuning
4. Compliance review

### Phase 4: Launch (Weeks 7-8)
1. Controlled experiment
2. K-factor measurement
3. Dashboard completion
4. Demo preparation

---

## Key Differences from Simplified Version

### More Ambitious
- **K-Factor Target**: 1.20 (not 0.5)
- **Agent System**: Full MCP architecture (not simplified)
- **Session Intelligence**: Transcription required (not optional)
- **Technical Specs**: <150ms SLA, 5k concurrent users

### More Complex
- **8 Viral Loops** to choose from (not 4 predefined)
- **7 Agents** (not simplified services)
- **Multi-Touch Attribution** (not just last-touch)
- **Compliance Requirements** (COPPA/FERPA)

### More Production-Ready
- **Event Schema**: Detailed tracking requirements
- **Analytics**: Real-time dashboards
- **Compliance**: Risk memo required
- **Testing**: Controlled experiments

---

## Critical Success Factors

1. **Agent System**: Must be production-ready, not just prototypes
2. **K-Factor ≥ 1.20**: This is ambitious - need strong loops
3. **Session Transcription**: Required for agentic actions
4. **Compliance**: COPPA/FERPA safe by default
5. **Performance**: <150ms SLA is strict requirement

---

## Next Steps

### Immediate
1. **Choose 4+ viral loops** from the menu (or propose new ones)
2. **Design MCP agent architecture** (orchestrator, personalization, etc.)
3. **Plan session transcription** system
4. **Design agentic actions** (2 student, 2 tutor minimum)

### Short Term
1. Build MCP agent infrastructure
2. Implement session transcription
3. Create first agentic action
4. Test end-to-end flow

### Medium Term
1. Build remaining viral loops
2. Implement presence UI
3. Create analytics dashboards
4. Run controlled experiment

---

## Notes

**Critical Insight**: This is a **production-ready system**, not a prototype. The MCP agent architecture, <150ms SLA, and K ≥ 1.20 target make this significantly more complex than a simple referral system.

**Warning**: Don't underestimate the complexity. The agent system alone is a major undertaking. Start with a simplified version, then build up.

**Recommendation**: Consider building a "thin-slice" first with 2 loops and 2 agentic actions, prove K ≥ 1.20, then expand.
