# Project 2: "The Challenge" - K Factor 10× Viral Growth
## Varsity Tutors Viral Growth System

**Project Type**: Growth & Marketing Platform  
**Timeline**: Ongoing Product Feature  
**Status**: 🚧 **PARTIALLY DONE** (Basic features exist, agentic actions pending)  
**Date**: November 2025

---

## Executive Summary

**The Challenge**: Design and implement a production-ready growth system that makes learning feel fun, social, and "alive," and that **10×'s viral growth** by turning every touchpoint into a shareable, referable moment—across students, parents, and tutors.

---

## Core Objective

Transform the AI Math Tutor into a **viral growth engine** by:
- Making every achievement, completion, and milestone shareable
- Enabling role-based referral systems (students, parents, tutors)
- Creating agentic actions that auto-generate shareable moments
- Tracking multi-touchpoint attribution
- Achieving **K-factor ≥ 0.5** (challenges + referrals per user)

---

## Success Criteria

### Primary Goals
- **K-Factor**: ≥ 0.5 (challenges + referrals per user)
- **Referral Rate**: ≥ 10% of users refer someone
- **Share Rate**: ≥ 5% of completions shared
- **Deep Link Conversion**: ≥ 20% to signup
- **Deep Link FVM**: ≥ 60% complete micro-task

### By User Type
- **Students**: K-factor ≥ 0.3
- **Parents**: K-factor ≥ 0.5
- **Tutors**: K-factor ≥ 1.0 (higher target - they're advocates)

---

## Key Requirements

### 1. Agentic Actions (Minimum 2 per User Type)

#### For Students (≥2 Required)

**1. Auto "Beat-My-Skill" Challenge**
- **Trigger**: After problem completion or session summary
- **Action**: Generate 5-question micro-deck based on skill gaps
- **Output**: Share link with challenge embedded
- **Reward**: Both challenger and challengee get streak shields if friend reaches FVM within 48 hours
- **Attribution**: Referral code embedded in challenge link

**2. Study Buddy Nudge**
- **Trigger**: If summary shows upcoming exam or stuck concept
- **Action**: Create co-practice invite tied to exact deck
- **Output**: Share link with practice deck
- **Reward**: Both get rewards for co-practice completion
- **Attribution**: Referral code embedded in invite

#### For Tutors (≥2 Required)

**1. Parent Progress Reel + Invite**
- **Trigger**: After session or progress update
- **Action**: Auto-compose privacy-safe 20-30 second reel (key moments & wins)
- **Output**: Share link with referral code for class pass
- **Reward**: Parents who sign up get class pass, tutor gets referral credit
- **Attribution**: Referral code tracks tutor advocacy

**2. Next-Session Prep Pack Share**
- **Trigger**: Before next scheduled session
- **Action**: AI-generated prep pack with class sampler link
- **Output**: Share link with prep materials
- **Reward**: Joins credit tutor's referral XP
- **Attribution**: Multi-touchpoint tracking

### 2. Role-Based Referral System

**Students Referring Students**
- Referee: 100 XP (welcome bonus)
- Referrer: 200 XP (standard reward)

**Parents/Teachers Referring Students** (HIGH VALUE)
- Referee: 150 XP (higher welcome bonus)
- Referrer: 300 XP (higher incentive for network growth)

**Parents/Teachers Referring Adults** (Network Growth)
- Referee: 100 XP
- Referrer: 250 XP (network building incentive)

**Tutors Referring** (Special Rewards)
- Referee: 100 XP
- Referrer: Class pass + 500 XP bonus (advocacy reward)

### 3. Multi-Touchpoint Attribution

**Track Referral Sources**
- Direct signup (referral code)
- Share link conversion
- Challenge completion → signup
- Achievement share → signup
- Prep pack share → signup
- Progress reel → signup

**Attribution Path**
```
User sees share → Clicks link → Views challenge → Completes challenge → Signs up
→ Attribution: share → challenge → referral
```

### 4. Share Cards & Deep Links

**Share Cards For**
- Problem completions
- Achievement unlocks
- Streak milestones
- Learning progress
- Challenge completions
- Level ups

**Deep Links**
- Pre-fill problem context
- Land users in "Try Now" micro-task (5-question challenge)
- Track attribution (referrer, source)
- Convert to signup with referral credit

---

## Technical Architecture

### Database Schema

```sql
-- Enhanced referrals table
ALTER TABLE referrals ADD COLUMN source_type VARCHAR(50);
-- 'signup', 'share', 'challenge', 'achievement', 'prep_pack', 'progress_reel'
ALTER TABLE referrals ADD COLUMN source_id UUID;
-- References shares.id, challenges.id, etc.
ALTER TABLE referrals ADD COLUMN referrer_role VARCHAR(20);
-- 'student', 'parent', 'teacher'
ALTER TABLE referrals ADD COLUMN referee_role VARCHAR(20);
-- 'student', 'parent', 'teacher'

-- Tutor-specific rewards
CREATE TABLE tutor_referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES auth.users(id),
  referral_id UUID REFERENCES referrals(id),
  reward_type VARCHAR(50), -- 'class_pass', 'ai_minutes', 'xp'
  reward_amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenges table
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES auth.users(id),
  challengee_id UUID REFERENCES auth.users(id),
  challenge_type VARCHAR(50), -- 'beat_my_skill', 'streak_rescue', 'co_practice'
  share_code VARCHAR(20),
  referral_code VARCHAR(20),
  status VARCHAR(20), -- 'pending', 'accepted', 'completed', 'expired'
  reward_type VARCHAR(50),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Agentic Action System

**Loop Orchestrator Agent**
- Chooses which loop to trigger based on events
- Coordinates eligibility and throttling
- Routes to appropriate agent

**Personalization Agent**
- Tailors invites, rewards, content copy
- Based on user persona (student, parent, tutor)
- Subject matter and intent aware

**Tutor Advocacy Agent**
- Generates share-packs for tutors
- Smart links, auto-generated thumbnails
- One-tap WhatsApp/SMS sharing
- Tracks referrals and attribution

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
- ✅ Basic referral system (DONE)
- ✅ Share cards & deep links (DONE)
- ⏳ Role-based rewards
- ⏳ Share ↔ Referral integration

### Phase 2: Agentic Actions (Weeks 3-4)
- ⏳ Auto "Beat-My-Skill" challenge generator
- ⏳ Study buddy nudge system
- ⏳ Parent progress reel generator
- ⏳ Tutor prep pack share system

### Phase 3: Attribution & Analytics (Weeks 5-6)
- ⏳ Multi-touchpoint attribution
- ⏳ K-factor dashboard
- ⏳ Referral source analytics
- ⏳ Conversion funnel tracking

### Phase 4: Tutor Advocacy (Weeks 7-8)
- ⏳ Tutor-specific referral dashboard
- ⏳ Class pass rewards
- ⏳ AI minutes rewards
- ⏳ Prep pack generation

---

## Current Status

### ✅ Completed
- Basic referral system (codes, tracking, rewards)
- Share cards & deep links
- Database schema (referrals, referral_codes, shares)
- API routes for referrals and shares
- Referral dashboard UI

### 🚧 In Progress
- Role-based rewards (partially done)
- Share ↔ Referral integration (pending)

### 📋 Not Started
- Agentic actions (all 4 required)
- Multi-touchpoint attribution
- Tutor advocacy features
- K-factor calculation & dashboard

---

## Key Features

### 1. Share Cards & Deep Links

**Share Card Generation**
- Automatic generation for achievements
- Customizable templates
- Embed referral codes
- Track clicks and conversions

**Deep Link Routing**
- `/s/[code]` - Deep link handler
- Pre-fills problem context
- Micro-task challenge (5 questions)
- Attribution tracking

### 2. Referral System

**Referral Code Generation**
- Unique 8-character codes
- Per-user active codes
- Automatic code creation
- Code validation

**Referral Tracking**
- Referrer → Referee relationships
- Status tracking (pending, completed, rewarded)
- Reward distribution
- Analytics dashboard

### 3. Challenge System

**Beat-My-Skill Challenges**
- Auto-generated from skill gaps
- 5-question micro-deck
- Share link with challenge
- Streak shield rewards

**Streak Rescue Challenges**
- Triggered when streak at risk
- Co-practice invites
- Both get streak shields
- Social engagement

### 4. Leaderboards

**Subject-Based Leaderboards**
- Algebra, Geometry, etc.
- Weekly/monthly filters
- Friend-only options
- Privacy controls

---

## Success Metrics

### Viral Growth Metrics
- **K-Factor**: ≥ 0.5 (challenges + referrals per user)
- **Referral Rate**: ≥ 10% of users refer someone
- **Share Rate**: ≥ 5% of completions shared
- **Deep Link Conversion**: ≥ 20% to signup
- **Deep Link FVM**: ≥ 60% complete micro-task

### By User Type
- **Students**: K-factor ≥ 0.3, Referral rate ≥ 8%
- **Parents**: K-factor ≥ 0.5, Referral rate ≥ 12%
- **Tutors**: K-factor ≥ 1.0, Referral rate ≥ 15%

### Attribution Metrics
- Share → Signup conversion: ≥ 20%
- Challenge → Signup conversion: ≥ 15%
- Multi-touchpoint attribution: Track all paths

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

## Dependencies

### Required Infrastructure
- ✅ User authentication (Supabase) - DONE
- ✅ Student profiles (Model B) - DONE
- ✅ User roles (student, parent, teacher) - DONE
- ✅ Profile relationships - DONE
- ⏳ Agentic action system - PENDING

### External Services
- OpenAI API (for content generation)
- Image generation (for share cards)
- SMS/Email (for notifications)
- Analytics platform

---

## Next Steps

### Immediate (This Week)
1. Implement role-based rewards
2. Integrate shares with referrals
3. Test referral flow end-to-end

### Short Term (Next 2 Weeks)
1. Build first agentic action (Beat-My-Skill challenge)
2. Test with real users
3. Measure K-factor

### Medium Term (Weeks 3-8)
1. Build remaining agentic actions
2. Implement multi-touchpoint attribution
3. Create K-factor dashboard
4. Optimize conversion funnels

---

## Notes

**Critical Success Factor**: The system must feel **natural and valuable**, not spammy. Every share/referral should provide genuine value to both parties.

**Key Insight**: Tutors are the highest-value advocates. They have direct relationships with parents and students, making them ideal for viral growth.

**Warning**: Don't build all agentic actions at once. Start with one, test it, learn, then build the next.

