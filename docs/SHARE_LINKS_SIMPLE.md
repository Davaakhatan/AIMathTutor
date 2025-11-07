# Share Links - Simple Explanation

## What is a Share Link?

A **Share Link** is a special URL that lets you share your achievements, progress, or problems with friends.

Think of it like sharing a photo on Instagram, but instead of a photo, you're sharing:
- 🏆 An achievement you unlocked
- 🔥 Your study streak
- 📈 Your level progress
- ✅ A problem you solved

---

## How It Works (Step by Step)

### Step 1: You Do Something Cool
- You unlock an achievement 🏆
- You reach a 7-day streak 🔥
- You solve a hard problem ✅

### Step 2: You Click "Share"
- A button appears (we'll add this soon)
- You click it
- A link is created: `http://localhost:3002/share/ABC12345`

### Step 3: You Share the Link
- Copy the link
- Send it to a friend (WhatsApp, Instagram, etc.)
- Or use the native share button on your phone

### Step 4: Friend Clicks Your Link
- Friend opens the link
- They see a nice card showing what you achieved
- Example: "John just unlocked 'Math Master' achievement! 🎉"

### Step 5: Friend Tries It
- Friend clicks "Try Now" button
- They get redirected to the app
- They can try the same problem or sign up

---

## Real Example

**You:**
1. Solve 10 problems → Unlock "Problem Solver" achievement
2. Click "Share" button
3. Get link: `http://localhost:3002/share/XYZ789`
4. Share on Instagram: "Just unlocked Problem Solver! 🎯"

**Your Friend:**
1. Sees your post, clicks link
2. Opens: `http://localhost:3002/share/XYZ789`
3. Sees card: "John unlocked Problem Solver! 🎯"
4. Clicks "Try Now"
5. Gets redirected to app to try it themselves

---

## Two Types of Links

### 1. Share Page (`/share/CODE`)
- **What**: Shows a nice visual card
- **Who sees it**: Anyone (public)
- **Purpose**: Display what you achieved

### 2. Deep Link (`/s/CODE`)
- **What**: Redirects to the app
- **Who sees it**: Anyone (public)
- **Purpose**: Bring friends into the app

---

## Why Share Links Matter

✅ **Free Marketing**: Your friends do the advertising  
✅ **Social Proof**: "If John can do it, I can too!"  
✅ **Viral Growth**: More shares = more users  
✅ **Fun**: Show off your achievements!

---

## Current Status

### ✅ What's Built:
- Share link creation (backend)
- Share page display
- Deep link redirects
- Click tracking

### ⏳ What's Missing:
- Share buttons on achievements (we'll add this!)
- Share buttons on problem completion
- Share buttons on streak milestones

---

## How to Test Right Now

### Option 1: Manual Test (Browser Console)

1. **Open your app** and sign in
2. **Open browser console** (F12)
3. **Run this code**:

```javascript
// Get your user ID from localStorage
const userId = JSON.parse(localStorage.getItem('sb-YOUR_PROJECT-refresh-token') || '{}').user?.id || 
                'YOUR_USER_ID_HERE'; // Or get from useAuth()

// Create a test share
fetch('/api/share/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userId,
    shareType: 'achievement',
    metadata: {
      achievement_title: 'Problem Solver',
      achievement_type: 'problems_10'
    }
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Share created!');
  console.log('📋 Share URL:', data.shareUrl);
  console.log('🔗 Deep Link:', data.deepLinkUrl);
  console.log('\n👉 Open these URLs in new tabs:');
  window.open(data.shareUrl, '_blank'); // Opens share page
  // window.open(data.deepLinkUrl, '_blank'); // Opens deep link
});
```

4. **Two tabs will open**:
   - Share page: Shows your achievement card
   - Deep link: Redirects to app

### Option 2: Direct URL Test

1. **First, create a share** (use Option 1 above)
2. **Copy the share code** (e.g., `ABC12345`)
3. **Visit these URLs**:
   - Share page: `http://localhost:3002/share/ABC12345`
   - Deep link: `http://localhost:3002/s/ABC12345`

---

## What You'll See

### Share Page (`/share/CODE`):
```
┌─────────────────────────────┐
│   Achievement Unlocked!      │
│                             │
│   Problem Solver 🎯          │
│                             │
│   [Try Now]  [Learn More]   │
└─────────────────────────────┘
```

### Deep Link (`/s/CODE`):
- Automatically redirects
- Takes you to the app
- Pre-fills problem (if it's a problem share)

---

## Next Steps

1. **We'll add Share buttons** to:
   - ✅ Achievement cards (when unlocked)
   - ✅ Problem completion screen
   - ✅ Streak milestones
   - ✅ Level up notifications

2. **Then you can**:
   - Click "Share" anywhere
   - Get a link instantly
   - Share with friends!

---

## Questions?

**Q: Do I need to be logged in?**  
A: Yes, to create shares. But anyone can view/share links.

**Q: Can I share multiple times?**  
A: Yes! Each share creates a new unique link.

**Q: Do shares expire?**  
A: No, unless you set an expiration date (optional).

**Q: Can I see who clicked my share?**  
A: Yes! Click count is tracked in the database.

---

## Summary

**Share Links = Special URLs that let you show off your achievements and bring friends to the app!**

It's like sharing a photo, but for your learning progress! 📸🎓

