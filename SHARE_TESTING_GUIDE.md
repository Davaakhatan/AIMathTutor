# Share Cards & Deep Links - Testing Guide

## Prerequisites

1. **Run Database Migration**
   - Go to Supabase Dashboard → SQL Editor
   - Run the migration: `supabase/migrations/create_shares_table.sql`
   - Verify the `shares` table was created

2. **Ensure You're Logged In**
   - Share functionality requires authentication
   - Sign in as a user (student, parent, or teacher)

---

## Testing Share Cards

### Test 1: Share an Achievement

1. **Trigger an Achievement** (if you have achievements unlocked):
   - Open Settings Menu → XP & Level tab
   - Or unlock an achievement through normal gameplay

2. **Find Share Button**:
   - Look for a "Share" button next to achievements
   - (Note: Share buttons need to be added to components - see below)

3. **Click Share**:
   - Should open native share dialog (mobile) or copy link (desktop)
   - Link should be in format: `http://localhost:3002/share/XXXXX`

### Test 2: Share via Code (Manual Test)

Since share buttons aren't integrated yet, you can test manually:

1. **Open Browser Console**:
   ```javascript
   // Test creating a share
   fetch('/api/share/generate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userId: 'YOUR_USER_ID', // Get from AuthContext or localStorage
       shareType: 'achievement',
       metadata: {
         achievement_title: 'Math Master',
         achievement_type: 'level_5'
       }
     })
   })
   .then(r => r.json())
   .then(data => {
     console.log('Share created:', data);
     console.log('Share URL:', data.shareUrl);
   });
   ```

2. **Copy the Share URL** and open it in a new tab

---

## Testing Deep Links

### Test 1: Direct Deep Link Access

1. **Create a Share** (using method above or via component)

2. **Get the Share Code** from the response (e.g., `ABC12345`)

3. **Visit Deep Link**:
   - URL: `http://localhost:3002/s/ABC12345`
   - Should redirect based on share type:
     - **Problem**: Pre-fills problem input
     - **Achievement/Progress/Streak**: Shows landing page with "Try Now" button
     - **Challenge**: Redirects to challenge page

4. **Check Console**:
   - Should see: `[DEBUG] Share click tracked`
   - Click count should increment in database

### Test 2: Share Page

1. **Visit Share Page**:
   - URL: `http://localhost:3002/share/ABC12345`
   - Should display share card with:
     - Share type title
     - Metadata (achievement name, streak days, etc.)
     - "Try Now" button
     - "Learn More" button

2. **Click "Try Now"**:
   - Should redirect to `/s/ABC12345` (deep link)

---

## Testing Attribution Tracking

### Test 1: Track Click

1. **Create a share** (get share code)

2. **Visit share link**:
   ```bash
   curl http://localhost:3002/api/share/track-click \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"shareCode": "YOUR_SHARE_CODE"}'
   ```

3. **Check Database**:
   - Go to Supabase → `shares` table
   - Find your share by `share_code`
   - Verify `click_count` increased

### Test 2: Track Conversion

1. **Create a share** (get share code)

2. **Simulate signup from share**:
   ```bash
   curl http://localhost:3002/api/share/track-conversion \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "shareCode": "YOUR_SHARE_CODE",
       "newUserId": "NEW_USER_ID"
     }'
   ```

3. **Check Database**:
   - Verify `conversion_count` increased

---

## Quick Test Script

Create a test file `test-share.js`:

```javascript
// Run in browser console while logged in
async function testShare() {
  const userId = 'YOUR_USER_ID'; // Get from useAuth() or localStorage
  
  // 1. Create share
  const createRes = await fetch('/api/share/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      shareType: 'achievement',
      metadata: {
        achievement_title: 'Test Achievement',
        achievement_type: 'test'
      }
    })
  });
  
  const createData = await createRes.json();
  console.log('✅ Share created:', createData);
  
  const shareCode = createData.share.share_code;
  const shareUrl = createData.shareUrl;
  
  // 2. Test share page
  console.log('📋 Share URL:', shareUrl);
  console.log('🔗 Deep Link:', createData.deepLinkUrl);
  
  // 3. Test tracking
  const trackRes = await fetch('/api/share/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shareCode })
  });
  
  console.log('✅ Click tracked:', await trackRes.json());
  
  // 4. Get share data
  const getRes = await fetch(`/api/share/${shareCode}`);
  const getData = await getRes.json();
  console.log('✅ Share data:', getData);
  
  return { shareCode, shareUrl, deepLinkUrl: createData.deepLinkUrl };
}

// Run test
testShare().then(result => {
  console.log('🎉 Test complete!');
  console.log('Open these URLs:');
  console.log('Share Page:', result.shareUrl);
  console.log('Deep Link:', result.deepLinkUrl);
});
```

---

## Integration Points (To Be Added)

Share buttons need to be added to:

1. **Achievements** (`components/unified/AchievementsContent.tsx`):
   ```tsx
   <ShareCard
     shareType="achievement"
     metadata={{
       achievement_title: achievement.title,
       achievement_type: achievement.achievement_type
     }}
   />
   ```

2. **Problem Completion** (in `app/page.tsx` or chat completion handler):
   ```tsx
   <ShareCard
     shareType="problem"
     metadata={{
       problem_text: currentProblem.text,
       problem_type: currentProblem.type
     }}
   />
   ```

3. **Streak Milestones** (`components/StudyStreak.tsx`):
   ```tsx
   <ShareCard
     shareType="streak"
     metadata={{
       streak_days: streak
     }}
   />
   ```

4. **Level Up** (`components/XPSystem.tsx`):
   ```tsx
   <ShareCard
     shareType="progress"
     metadata={{
       level: newLevel,
       xp: totalXP
     }}
   />
   ```

---

## Expected Behavior

### Share Flow:
1. User clicks "Share" → Share link created
2. User shares link (native share or copy)
3. Friend clicks link → Lands on `/share/CODE`
4. Friend clicks "Try Now" → Redirects to `/s/CODE`
5. Deep link redirects based on share type
6. Click tracked in database

### Database Tracking:
- `click_count`: Increments on each visit to share/deep link
- `conversion_count`: Increments when someone signs up from share

---

## Troubleshooting

### Issue: "Share not found"
- **Cause**: Share code doesn't exist or expired
- **Fix**: Check database for share code, verify expiration date

### Issue: "Failed to create share"
- **Cause**: User not authenticated or RLS policy issue
- **Fix**: Ensure user is logged in, check RLS policies

### Issue: Deep link doesn't redirect
- **Cause**: Share type not handled or invalid metadata
- **Fix**: Check share type in database, verify redirect logic in `/s/[code]/page.tsx`

### Issue: Click not tracked
- **Cause**: API route error or RLS policy
- **Fix**: Check browser console for errors, verify RLS policies allow updates

---

## Next Steps

1. ✅ Database migration (run in Supabase)
2. ✅ Test share creation via API
3. ✅ Test deep link redirects
4. ⏳ Add share buttons to components
5. ⏳ Test full user flow
6. ⏳ Test attribution tracking

