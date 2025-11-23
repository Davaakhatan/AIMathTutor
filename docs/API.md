# AI Math Tutor - API Documentation

## v2 API Endpoints

All v2 endpoints follow a consistent response format:
```json
{
  "success": boolean,
  "data": object | null,
  "error": string | null
}
```

---

## XP Endpoints

### GET /api/v2/xp
Get XP data for a user.

**Query Parameters:**
- `userId` (required): User ID
- `profileId` (optional): Student profile ID

**Response:**
```json
{
  "success": true,
  "data": {
    "total_xp": 150,
    "level": 2,
    "xp_to_next_level": 100,
    "xp_history": [
      {
        "date": "2025-11-22",
        "xp": 15,
        "reason": "Solved algebra problem",
        "timestamp": 1732297200000
      }
    ]
  }
}
```

---

## Streak Endpoints

### GET /api/v2/streak
Get streak data for a user.

**Query Parameters:**
- `userId` (required): User ID
- `profileId` (optional): Student profile ID

**Response:**
```json
{
  "success": true,
  "data": {
    "current_streak": 5,
    "longest_streak": 12,
    "last_study_date": "2025-11-22"
  }
}
```

---

## Problem Completion

### POST /api/v2/problem-completed
Record a completed problem and award XP/streak.

**Request Body:**
```json
{
  "userId": "user-id",
  "profileId": "profile-id",
  "problemType": "algebra",
  "difficulty": "medium",
  "hintsUsed": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "xp": {
      "gained": 15,
      "total": 165,
      "level": 2
    },
    "streak": {
      "current": 6,
      "longest": 12
    }
  }
}
```

---

## Nudges Endpoints

### GET /api/v2/nudges
Get active nudges for a user. Also runs nudge checks.

**Query Parameters:**
- `userId` (required): User ID
- `profileId` (optional): Student profile ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "nudge-uuid",
      "type": "streak_at_risk",
      "title": "Your streak is at risk!",
      "message": "You have a 5-day streak! Solve one problem to keep it going.",
      "priority": "medium",
      "action_url": "/",
      "action_label": "Practice Now",
      "created_at": "2025-11-22T18:00:00Z"
    }
  ]
}
```

### POST /api/v2/nudges
Dismiss a nudge.

**Request Body:**
```json
{
  "action": "dismiss",
  "nudgeId": "nudge-uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Nudge Types

| Type | Description | Priority |
|------|-------------|----------|
| `streak_at_risk` | User has streak but hasn't studied today (after 6 PM) | high (>7 days) / medium |
| `streak_lost` | User's streak was reset | medium |
| `goal_reminder` | Reminder about active goals | low |
| `comeback` | Re-engagement after inactivity | medium |
| `achievement_close` | Close to unlocking achievement | low |
| `practice_suggestion` | AI-suggested practice | low |
| `level_up_close` | Close to next level | medium |

---

## XP System

### Difficulty Multipliers
| Difficulty | Multiplier | Base XP (15) Result |
|------------|------------|---------------------|
| easy | 0.8x | 12 XP |
| medium | 1.0x | 15 XP |
| hard | 1.5x | 23 XP |
| elementary | 0.6x | 9 XP |
| middle | 1.0x | 15 XP |
| high | 1.3x | 20 XP |
| advanced | 1.8x | 27 XP |

### Hint Penalty
- Each hint used: -2 XP
- Minimum XP: 5

### Level Progression
| Level | XP Required | Cumulative XP |
|-------|-------------|---------------|
| 1 | 0 | 0 |
| 2 | 150 | 150 |
| 3 | 300 | 450 |
| 4 | 450 | 900 |
| 5 | 600 | 1500 |

Formula: `XP_for_level_N = 100 * N * 1.5`

### Login Bonuses
- First login: 60 XP
- Daily login: 10 XP

---

## Streak System

### Rules
- Study on consecutive days to maintain streak
- Missing a day resets streak to 0
- Studying multiple times in one day counts as 1 day
- Streak is at risk after 6 PM if not studied today

---

## Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `userId required` | Missing userId parameter |
| 400 | `problemType required` | Missing problemType in request |
| 400 | `nudgeId required` | Missing nudgeId for dismiss action |
| 500 | Internal error | Database or server error |

---

## Database Tables

### xp_data
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
student_profile_id UUID REFERENCES student_profiles(id)
total_xp INTEGER DEFAULT 0
level INTEGER DEFAULT 1
xp_to_next_level INTEGER DEFAULT 100
xp_history JSONB DEFAULT '[]'
```

### streaks
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
student_profile_id UUID REFERENCES student_profiles(id)
current_streak INTEGER DEFAULT 0
longest_streak INTEGER DEFAULT 0
last_study_date DATE
```

### nudges
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
student_profile_id UUID REFERENCES student_profiles(id)
type TEXT NOT NULL
title TEXT NOT NULL
message TEXT NOT NULL
priority TEXT DEFAULT 'medium'
action_url TEXT
action_label TEXT
dismissed BOOLEAN DEFAULT FALSE
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## Usage Examples

### JavaScript/TypeScript

```typescript
// Get XP data
const response = await fetch('/api/v2/xp?userId=xxx&profileId=yyy');
const { data } = await response.json();
console.log(`Level ${data.level}, ${data.total_xp} XP`);

// Complete a problem
const result = await fetch('/api/v2/problem-completed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'xxx',
    problemType: 'algebra',
    difficulty: 'medium',
    hintsUsed: 1
  })
});

// Get and dismiss nudges
const nudges = await fetch('/api/v2/nudges?userId=xxx');
const { data: activeNudges } = await nudges.json();

if (activeNudges.length > 0) {
  await fetch('/api/v2/nudges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'dismiss',
      nudgeId: activeNudges[0].id
    })
  });
}
```

---

**Last Updated:** November 2025
