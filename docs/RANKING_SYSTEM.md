# Ranking System Documentation

## Overview

The ranking system provides visual badges and titles based on user level, creating progression milestones and achievement recognition.

---

## Rank Tiers

| Rank | Badge | Levels | Color | Description |
|------|-------|--------|-------|-------------|
| **Novice** | I | 1-2 | Gray | Just starting the journey |
| **Apprentice** | II | 3-5 | Blue | Learning the basics |
| **Scholar** | III | 6-9 | Green | Building strong foundations |
| **Expert** | IV | 10-14 | Yellow | Mastering the concepts |
| **Master** | V | 15-19 | Orange | Exceptional problem solver |
| **Grandmaster** | VI | 20-29 | Purple | Elite mathematician |
| **Legend** | VII | 30-49 | Pink | Legendary status achieved |
| **Mythical** | VIII | 50-99 | Cyan | Among the greatest |
| **Immortal** | IX | 100+ | Fuchsia | Transcended all limits |

---

## Visual Display

### Badge Design
- **Roman numerals** (I-IX) for clean, professional look
- **Circular badge** with gradient background using rank color
- **Colored rank title** displayed next to level
- **Progress indicator** showing levels to next rank

### Example Display
```
┌─────────────────────────────────────┐
│  [III]  Level 7                     │
│         Scholar                      │
│         450 XP • 3 levels to Expert │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━ 75%     │
│  250 XP needed for next level       │
└─────────────────────────────────────┘
```

---

## Implementation

### Files
- `services/rankingService.ts` - Core ranking logic
- `components/unified/XPContent.tsx` - UI display

### Key Functions

```typescript
// Get rank for current level
getRankForLevel(level: number): RankInfo

// Get next rank to achieve
getNextRank(currentLevel: number): RankInfo | null

// Calculate levels needed for next rank
getLevelsToNextRank(currentLevel: number): number

// Check if user ranked up
didRankUp(oldLevel: number, newLevel: number): boolean

// Get rank up notification message
getRankUpMessage(newLevel: number): string
```

---

## Progression Path

### Early Game (Levels 1-9)
- **Novice (I)** → **Apprentice (II)** → **Scholar (III)**
- Focus: Learning fundamentals
- Quick progression through first 3 ranks

### Mid Game (Levels 10-29)
- **Expert (IV)** → **Master (V)** → **Grandmaster (VI)**
- Focus: Mastery and consistency
- Moderate progression, 5-10 levels per rank

### Late Game (Levels 30-99)
- **Legend (VII)** → **Mythical (VIII)**
- Focus: Excellence and dedication
- Slower progression, 20-50 levels per rank

### End Game (Level 100+)
- **Immortal (IX)**
- Focus: Ultimate achievement
- Permanent top-tier status

---

## XP to Reach Each Rank

Based on current XP formula:

| Rank | Min Level | Approx. XP Needed | Total XP |
|------|-----------|-------------------|----------|
| Novice | 1 | 0 | 0 |
| Apprentice | 3 | 250 | 250 |
| Scholar | 6 | ~750 | ~1,000 |
| Expert | 10 | ~2,250 | ~3,250 |
| Master | 15 | ~5,500 | ~8,750 |
| Grandmaster | 20 | ~9,000 | ~17,750 |
| Legend | 30 | ~21,000 | ~38,750 |
| Mythical | 50 | ~56,000 | ~94,750 |
| Immortal | 100 | ~186,000 | ~280,750 |

*Note: Values are approximate based on level progression*

---

## User Experience

### Benefits
1. **Clear Progression:** Visual feedback on advancement
2. **Motivation:** Next rank is always visible
3. **Achievement:** Rank titles create sense of accomplishment
4. **Status:** High ranks show dedication and skill

### Display Locations
- ✅ XP Content (main display)
- ⏳ Profile page (future)
- ⏳ Leaderboard (future - show rank badge)
- ⏳ Achievements page (future - show all ranks)

---

## Future Enhancements

### Planned Features
1. **Rank History:** Track when each rank was achieved
2. **Rank Perks:** Special features unlocked at each rank
3. **Rank Badges:** Collectible badges for achievements
4. **Rank Leaderboard:** Compare ranks with other users
5. **Custom Titles:** Unlock special titles at milestones
6. **Rank Challenges:** Special challenges for each rank tier

### Potential Additions
- Sub-ranks (e.g., Expert I, Expert II, Expert III)
- Seasonal ranks that reset
- Special event ranks
- Team ranks for collaborative learning

---

## Testing

### Test Cases

1. **Level 1 (Novice):**
   - Badge: I (gray)
   - Title: "Novice"
   - Next: Apprentice at level 3

2. **Level 10 (Expert):**
   - Badge: IV (yellow)
   - Title: "Expert"
   - Next: Master at level 15

3. **Level 100 (Immortal):**
   - Badge: IX (fuchsia)
   - Title: "Immortal"
   - Next: None (max rank)

---

## Design Principles

1. **No Emojis:** Uses Roman numerals for clean, professional look
2. **Color-Coded:** Each rank has distinct color for quick recognition
3. **Progressive:** Clear path from beginner to expert
4. **Achievable:** Early ranks are easy, later ranks feel prestigious
5. **Motivating:** Always shows progress to next rank

---

**Status:** ✅ IMPLEMENTED
**Date:** 2025-11-08
**Version:** 1.0

