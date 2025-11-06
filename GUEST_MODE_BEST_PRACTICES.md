# Guest Mode Best Practices

## Overview
This document outlines best practices for handling guest mode vs authenticated users across all features.

## Core Principles

1. **Progressive Disclosure**: Show features but indicate limitations
2. **Value Demonstration**: Allow guests to experience core functionality
3. **Clear Communication**: Always indicate when data is temporary
4. **Conversion Focus**: Make sign-up benefits clear without being pushy

---

## Feature-by-Feature Guide

### 1. **Gamification Hub** (Achievements + Leaderboard)

#### Guest Mode:
- ✅ **Show**: Local achievements and progress (localStorage)
- ✅ **Show**: Local leaderboard (localStorage only)
- ⚠️ **Indicate**: "Progress saved locally only. Sign up to sync across devices and compete globally."
- ❌ **Hide**: Global leaderboard participation
- ❌ **Hide**: Achievement sharing/social features

#### Authenticated User:
- ✅ Full achievement tracking (cloud-synced)
- ✅ Global leaderboard participation
- ✅ Achievement sharing
- ✅ Cross-device sync
- ✅ Achievement history

**Implementation**: Add banner in `AchievementsContent` and `LeaderboardContent` when `isGuestMode={true}`

---

### 2. **Learning Hub** (Dashboard + History + Practice + Suggestions)

#### Guest Mode:
- ✅ **Show**: Problem solving (full access)
- ✅ **Show**: Local history (last 20 problems, localStorage)
- ✅ **Show**: Practice problems
- ✅ **Show**: Problem suggestions
- ⚠️ **Indicate**: "History saved locally. Sign up to access unlimited history and sync across devices."
- ❌ **Hide**: Cloud-synced history
- ❌ **Hide**: Personalized recommendations (use generic instead)
- ❌ **Hide**: Learning path progression (show preview only)

#### Authenticated User:
- ✅ Unlimited problem history (cloud-synced)
- ✅ Personalized recommendations
- ✅ Learning path with progression tracking
- ✅ Cross-device access
- ✅ Problem analytics and insights

**Implementation**: 
- Add banner in `HistoryContent` when `isGuestMode={true}`
- Limit history display to 20 items for guests
- Show "Sign up for unlimited history" CTA

---

### 3. **Tools Menu** (Search + Tips + Formulas)

#### Guest Mode:
- ✅ **Full Access**: All reference materials (formulas, tips, shortcuts)
- ✅ **Full Access**: Search functionality
- ✅ **Show**: Local bookmarks (localStorage)
- ⚠️ **Indicate**: "Bookmarks saved locally. Sign up to sync across devices."
- ❌ **Hide**: Cloud-synced bookmarks

#### Authenticated User:
- ✅ All guest features
- ✅ Cloud-synced bookmarks
- ✅ Personalized favorites
- ✅ Search history sync

**Implementation**: Minimal changes - add subtle banner in search/bookmarks section

---

### 4. **Settings Menu** (Settings + Notifications + XP + Reminders)

#### Guest Mode:
- ✅ **Show**: Basic settings (theme, voice, accessibility)
- ✅ **Show**: Local XP tracking (localStorage)
- ✅ **Show**: Local notifications
- ⚠️ **Indicate**: "Settings saved locally. Sign up to sync across devices."
- ⚠️ **Indicate**: "XP tracked locally. Sign up to save permanently and compete."
- ❌ **Hide**: Cloud sync settings
- ❌ **Hide**: Email notifications
- ❌ **Hide**: Account management

#### Authenticated User:
- ✅ All guest features
- ✅ Cloud-synced settings
- ✅ Email notifications
- ✅ Account management
- ✅ Data export/import
- ✅ Privacy controls

**Implementation**: 
- Add banners in `XPContent` and `SettingsContent`
- Disable cloud sync options for guests

---

### 5. **Progress Hub** (Stats + Goals + Timer + Streak)

#### Guest Mode:
- ✅ **Show**: Local stats (localStorage)
- ✅ **Show**: Daily goals (localStorage)
- ✅ **Show**: Study timer (session-based)
- ✅ **Show**: Local streak (localStorage)
- ⚠️ **Indicate**: "Progress tracked locally. Sign up to save permanently and never lose your streak."
- ❌ **Hide**: Long-term analytics
- ❌ **Hide**: Cross-device streak sync

#### Authenticated User:
- ✅ All guest features
- ✅ Cloud-synced stats
- ✅ Long-term analytics
- ✅ Cross-device streak sync
- ✅ Goal history
- ✅ Detailed progress reports

**Implementation**: 
- Add banner in each tab (Stats, Goals, Timer, Streak)
- Emphasize data loss risk for guests

---

## UI/UX Guidelines

### Banner Placement
- Place banners at the top of relevant sections
- Use consistent styling (blue for info, amber for warnings)
- Keep banners dismissible but re-showable

### CTA Strategy
- Use contextual CTAs: "Sign up to save permanently"
- Don't block functionality, just inform
- Show benefits, not restrictions

### Data Persistence Messaging
- **LocalStorage**: "Saved locally (this device only)"
- **Cloud Sync**: "Synced across all devices"
- **Temporary**: "Progress will be lost if you clear browser data"

### Conversion Points
1. After solving first problem: "Great job! Sign up to save your progress."
2. When viewing history: "Sign up for unlimited history"
3. When viewing achievements: "Sign up to compete globally"
4. When setting goals: "Sign up to never lose your streak"

---

## Technical Implementation

### Props Pattern
```typescript
interface ComponentProps {
  isGuestMode?: boolean;
  onSignUpClick?: () => void;
  // ... other props
}
```

### Banner Component
Use `GuestModeBanner` component for consistent messaging:
```tsx
<GuestModeBanner 
  message="Progress saved locally only"
  onSignUp={onSignUpClick}
  variant="info"
/>
```

### Data Storage Strategy
- **Guest**: localStorage only (temporary)
- **User**: localStorage + Supabase (persistent)
- **Migration**: On sign-up, migrate localStorage data to Supabase

---

## Testing Checklist

- [ ] All features accessible in guest mode
- [ ] Guest mode indicators visible
- [ ] Sign-up CTAs functional
- [ ] Data persists in localStorage for guests
- [ ] Data syncs to cloud for authenticated users
- [ ] No blocking restrictions (only informational)
- [ ] Clear messaging about data persistence
- [ ] Conversion flows work smoothly

---

## Summary

**Guest Mode Philosophy**: 
- Show value, don't hide features
- Inform, don't restrict
- Encourage sign-up through benefits, not limitations

**Key Message**: 
"Experience everything now, sign up to save it forever."

