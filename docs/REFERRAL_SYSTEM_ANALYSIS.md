# Referral System Analysis & Proposal
## "The Challenge" - Varsity Tutors 10× Viral Growth

**Date**: November 2025  
**Status**: Analysis & Design Phase

---

## Current State

### ✅ What We Have

1. **Basic Referral System**
   - Unique referral codes per user
   - Tracking in `referrals` and `referral_codes` tables
   - Fixed rewards: 100 XP (referee), 200 XP (referrer)
   - Works for all user types (same rewards)

2. **Share Cards & Deep Links**
   - Share links for achievements, problems, streaks, progress
   - Deep links (`/s/[code]`) for micro-tasks
   - Click tracking and conversion tracking
   - **BUT**: Not integrated with referrals

3. **Database Schema**
   - `referrals` table: tracks referrer → referee relationships
   - `referral_codes` table: tracks active codes per user
   - `shares` table: tracks share links (separate from referrals)

### ❌ What's Missing for "The Challenge"

1. **No Role-Based Rewards**
   - Everyone gets same rewards (100/200 XP)
   - No special incentives for parents/tutors to bring in students
   - No "class pass" or "AI minutes" rewards for tutors

2. **No Integration Between Shares & Referrals**
   - Shares don't automatically create referral opportunities
   - Can't track if a share converted to a referral
   - Missing attribution: "Who shared what that led to signup?"

3. **No Agentic Actions**
   - No auto-generated "Beat-My-Skill" challenges
   - No parent progress reels with referral links
   - No tutor advocacy system
   - Missing: "Turn every touchpoint into shareable moment"

4. **No Multi-Touchpoint Referrals**
   - Only tracks signup referrals
   - Missing: referrals from challenges, shares, achievements
   - No "referral from share" vs "referral from code" distinction

5. **No Tutor Advocacy Features**
   - No class pass rewards
   - No prep pack sharing with referral credit
   - No special tutor referral dashboard

---

## Requirements from "The Challenge"

### Core Goal
**10× viral growth by turning every touchpoint into a shareable, referable moment**

### Key Requirements

1. **For Students** (≥2 agentic actions)
   - Auto "Beat-My-Skill" Challenge: Generate 5-question micro-deck with share link
   - Study Buddy Nudge: Co-practice invites tied to exact deck
   - Both should include referral attribution

2. **For Tutors** (≥2 agentic actions)
   - Parent Progress Reel: 20-30s reel with referral link for class pass
   - Next-Session Prep Pack Share: AI-generated prep pack with class sampler link
   - Referral XP credit for tutor

3. **For Parents**
   - Refer other parents (network growth)
   - Refer students (bring in learners)
   - Different rewards than students

4. **Attribution & Tracking**
   - Track which share/challenge led to referral
   - Multi-touch attribution
   - K-factor calculation: challenges + referrals per user

---

## Proposed Unified Referral System

### 1. Enhanced Database Schema

```sql
-- Add to referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS source_type VARCHAR(50); 
-- 'signup', 'share', 'challenge', 'achievement', 'prep_pack', 'progress_reel'
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS source_id UUID; 
-- References shares.id, challenges.id, etc.
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_role VARCHAR(20); 
-- 'student', 'parent', 'teacher'
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_role VARCHAR(20); 
-- 'student', 'parent', 'teacher'

-- Add to shares table (already exists, but enhance)
-- shares table already has conversion_count, but we need to link to referrals
ALTER TABLE shares ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES referrals(id);

-- New: Tutor-specific referral rewards
CREATE TABLE IF NOT EXISTS tutor_referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES auth.users(id),
  referral_id UUID REFERENCES referrals(id),
  reward_type VARCHAR(50), -- 'class_pass', 'ai_minutes', 'xp'
  reward_amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Role-Based Reward Structure

```typescript
interface RewardTiers {
  // Students referring students
  student_to_student: {
    referee: { type: 'xp', amount: 100 },
    referrer: { type: 'xp', amount: 200 }
  },
  
  // Parents/Teachers referring students (HIGH VALUE)
  adult_to_student: {
    referee: { type: 'xp', amount: 150 }, // Higher welcome bonus
    referrer: { type: 'xp', amount: 300 } // Higher incentive
  },
  
  // Parents/Teachers referring adults (network growth)
  adult_to_adult: {
    referee: { type: 'xp', amount: 100 },
    referrer: { type: 'xp', amount: 250 }
  },
  
  // Tutors referring (special rewards)
  tutor_referral: {
    referee: { type: 'xp', amount: 100 },
    referrer: { 
      type: 'class_pass', // or 'ai_minutes'
      amount: 1,
      xp_bonus: 500 // Additional XP
    }
  }
}
```

### 3. Integration: Shares → Referrals

**Every share should be a potential referral:**

```typescript
// When creating a share, also create referral opportunity
async function createShareWithReferral(
  userId: string,
  shareType: string,
  metadata: any
) {
  // 1. Create share link
  const share = await createShare(userId, shareType, metadata);
  
  // 2. Embed referral code in share metadata
  const referralCode = await getOrCreateReferralCode(userId);
  const shareWithReferral = {
    ...share,
    metadata: {
      ...share.metadata,
      referral_code: referralCode, // Embed in share
      referral_url: `${baseUrl}/signup?ref=${referralCode}&share=${share.share_code}`
    }
  };
  
  // 3. Track: share → referral conversion
  // When someone signs up from share, create referral with source_type='share'
}
```

### 4. Agentic Actions Implementation

#### For Students: Auto "Beat-My-Skill" Challenge

```typescript
// After problem completion or session summary
async function generateBeatMySkillChallenge(
  userId: string,
  skillGaps: string[],
  studentProfileId: string
) {
  // 1. Generate 5-question micro-deck based on skill gaps
  const challenge = await generateMicroDeck(skillGaps, 5);
  
  // 2. Create share link with challenge
  const share = await createShare(userId, 'challenge', {
    challenge_type: 'beat_my_skill',
    questions: challenge.questions,
    skill_gaps: skillGaps
  });
  
  // 3. Embed referral code
  const referralCode = await getOrCreateReferralCode(userId);
  
  // 4. Create challenge record
  await createChallenge({
    challenger_id: userId,
    challenge_type: 'beat_my_skill',
    share_code: share.share_code,
    referral_code: referralCode,
    reward: 'streak_shield' // Both get streak shield if friend completes
  });
  
  // 5. Return shareable link
  return {
    shareUrl: getShareUrl(share.share_code),
    deepLinkUrl: getDeepLinkUrl(share.share_code),
    referralUrl: `${baseUrl}/signup?ref=${referralCode}&challenge=${share.share_code}`
  };
}
```

#### For Tutors: Parent Progress Reel + Referral

```typescript
// After session or progress update
async function generateParentProgressReel(
  tutorId: string,
  studentProfileId: string,
  progressData: any
) {
  // 1. Generate 20-30s reel (key moments & wins)
  const reel = await generateProgressReel(progressData);
  
  // 2. Create share link
  const share = await createShare(tutorId, 'progress_reel', {
    student_profile_id: studentProfileId,
    reel_data: reel,
    privacy_safe: true // COPPA/FERPA compliant
  });
  
  // 3. Get tutor referral code (special class pass rewards)
  const referralCode = await getOrCreateReferralCode(tutorId);
  
  // 4. Return shareable link with referral
  return {
    shareUrl: getShareUrl(share.share_code),
    referralUrl: `${baseUrl}/signup?ref=${referralCode}&share=${share.share_code}&type=class_pass`,
    // Special: Parents who sign up get class pass, tutor gets referral credit
  };
}
```

### 5. Multi-Touchpoint Attribution

```typescript
// Track referral source
interface ReferralSource {
  source_type: 'signup' | 'share' | 'challenge' | 'achievement' | 'prep_pack' | 'progress_reel';
  source_id: string; // share.id, challenge.id, etc.
  touchpoints: Array<{
    type: string;
    id: string;
    timestamp: string;
  }>; // Full attribution path
}

// When creating referral
async function createReferral(
  referrerId: string,
  refereeId: string,
  referralCode: string,
  source?: ReferralSource
) {
  await supabase.from('referrals').insert({
    referrer_id: referrerId,
    referee_id: refereeId,
    referral_code: referralCode,
    source_type: source?.source_type || 'signup',
    source_id: source?.source_id || null,
    referrer_role: await getUserRole(referrerId),
    referee_role: await getUserRole(refereeId),
    metadata: {
      touchpoints: source?.touchpoints || []
    }
  });
}
```

### 6. K-Factor Calculation

```typescript
// Calculate K-factor: (challenges + referrals) per user
async function calculateKFactor(userId: string): Promise<number> {
  const referrals = await getUserReferrals(userId);
  const challenges = await getUserChallenges(userId);
  
  return (referrals.length + challenges.length) / 1; // Per user
}

// System-wide K-factor
async function calculateSystemKFactor(): Promise<number> {
  const totalReferrals = await getTotalReferrals();
  const totalChallenges = await getTotalChallenges();
  const totalUsers = await getTotalUsers();
  
  return (totalReferrals + totalChallenges) / totalUsers;
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. ✅ Basic referral system (DONE)
2. ✅ Share cards & deep links (DONE)
3. ⏳ **Add role-based rewards**
4. ⏳ **Integrate shares with referrals**

### Phase 2: Agentic Actions (Week 2-3)
1. ⏳ Auto "Beat-My-Skill" challenge generator
2. ⏳ Study buddy nudge system
3. ⏳ Parent progress reel generator
4. ⏳ Tutor prep pack share system

### Phase 3: Attribution & Analytics (Week 4)
1. ⏳ Multi-touchpoint attribution
2. ⏳ K-factor dashboard
3. ⏳ Referral source analytics
4. ⏳ Conversion funnel tracking

### Phase 4: Tutor Advocacy (Week 5)
1. ⏳ Tutor-specific referral dashboard
2. ⏳ Class pass rewards
3. ⏳ AI minutes rewards
4. ⏳ Prep pack generation

---

## Success Metrics

### K-Factor Targets
- **System-wide**: ≥ 0.5 (challenges + referrals per user)
- **By role**:
  - Students: ≥ 0.3
  - Parents: ≥ 0.5
  - Tutors: ≥ 1.0 (higher target - they're advocates)

### Referral Rate Targets
- **Overall**: ≥ 10% of users refer someone
- **By source**:
  - Direct signup: ≥ 5%
  - Share links: ≥ 3%
  - Challenges: ≥ 2%

### Conversion Targets
- **Share → Signup**: ≥ 20%
- **Challenge → Signup**: ≥ 15%
- **Deep Link FVM**: ≥ 60%

---

## Next Steps

1. **Review this proposal** - Does this align with "The Challenge" vision?
2. **Prioritize features** - Which agentic actions to build first?
3. **Start with role-based rewards** - Quick win, high impact
4. **Then integrate shares ↔ referrals** - Unlocks multi-touchpoint growth
5. **Build agentic actions** - One at a time, test, iterate

---

## Questions for Discussion

1. **Reward Structure**: Are the proposed reward tiers appropriate?
2. **Tutor Rewards**: Should tutors get class passes, AI minutes, or both?
3. **Agentic Actions**: Which should we build first?
4. **Attribution**: How detailed should multi-touchpoint tracking be?
5. **K-Factor**: Is 0.5 the right target, or should it be higher?

