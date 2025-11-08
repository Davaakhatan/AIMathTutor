# 🚨 URGENT FIXES NEEDED

## 🐛 Current Issues

### **1. TypeError in Data Loading**
**Error:**
```
[ERROR] Error loading problem history from database Object { error: TypeError }
[ERROR] Error loading XP data from database Object { error: TypeError }
[ERROR] Error loading streak data from database Object { error: TypeError }
[ERROR] Error loading daily goals from database Object { error: TypeError }
[ERROR] Error loading study sessions from database Object { error: TypeError }
```

**Cause:**
- The recent `.maybeSingle()` change might have introduced issues
- OR there's a database connection problem
- OR RLS policies are still blocking queries

**Impact:**
- Data not loading from database
- Falls back to localStorage (working, but not syncing)

---

### **2. Generate Practice Problem Not Working**
**Symptom:**
- User clicks "Generate" button
- Console shows: "Generating problem with difficulty: elementary"
- But nothing happens - no problem generated
- No error shown to user

**Likely Causes:**
1. **No OpenAI API Key configured**
   - Check `.env.local` for `OPENAI_API_KEY`
   - Or user hasn't entered API key in Settings

2. **API Request Failing Silently**
   - The `/api/generate-problem` route might be returning an error
   - But the error isn't being caught/displayed in UI

3. **Timeout Issue**
   - 15-second timeout might be too short
   - OpenAI API might be slow

---

## ✅ IMMEDIATE FIXES NEEDED

### **Fix #1: Add Better Error Logging**

The TypeError needs more details. Update error logging to show the actual error message, not just "TypeError".

**File:** All hooks (useXPData, useStreakData, useProblemHistory, etc.)

**Change:**
```typescript
// Before
logger.error("Error loading XP data from database", { error });

// After
logger.error("Error loading XP data from database", { 
  error,
  errorMessage: error?.message || String(error),
  errorStack: error?.stack,
  userId 
});
```

---

### **Fix #2: Add Error Display for Generate Button**

The Generate button fails silently. Add error handling and user feedback.

**File:** `components/ProblemGenerator.tsx`

**Add state for error:**
```typescript
const [error, setError] = useState<string | null>(null);
```

**Update handleGenerate:**
```typescript
const handleGenerate = async () => {
  setIsGenerating(true);
  setError(null); // Clear previous errors
  
  try {
    // ... existing code ...
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.problem) {
        onProblemGenerated(result.problem);
        setIsGenerating(false);
        return;
      } else {
        // API returned success=false
        setError(result.error || "Failed to generate problem");
      }
    } else {
      // HTTP error
      const result = await response.json();
      setError(result.error || `Server error: ${response.status}`);
    }
    
  } catch (error: any) {
    console.error("Error generating problem:", error);
    setError(error.message || "Failed to generate problem. Please try again.");
  } finally {
    setIsGenerating(false);
  }
};
```

**Add error display in UI:**
```typescript
{error && (
  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
  </div>
)}
```

---

### **Fix #3: Check OpenAI API Key**

**Option A: Check .env.local file**
```bash
# In your project root
cat .env.local | grep OPENAI_API_KEY
```

If missing, add:
```
OPENAI_API_KEY=sk-your-api-key-here
```

Then **RESTART THE DEV SERVER**!

**Option B: Use Settings to Enter API Key**
1. Click Settings (gear icon)
2. Enter OpenAI API key
3. Click Save
4. Try generating again

---

### **Fix #4: Increase Timeout**

**File:** `components/ProblemGenerator.tsx`

**Change timeout from 15s to 30s:**
```typescript
// Before
const timeoutId = setTimeout(() => controller.abort(), 15000);

// After
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
```

---

### **Fix #5: Fix TypeError in Data Loading**

The `.maybeSingle()` change was correct, but we need to ensure the response is handled properly.

**Check these functions in** `services/supabaseDataService.ts`:
- `getProblemHistory()`
- `getDailyGoals()`
- `getStudySessions()`

Make sure they all use `.maybeSingle()` instead of `.single()` when expecting 0-1 rows.

---

## 🧪 Testing Steps

### **Test 1: Check API Key**
```bash
echo $OPENAI_API_KEY  # Should show your key
```

If not set:
```bash
export OPENAI_API_KEY="sk-your-key-here"
npm run dev
```

### **Test 2: Test Generate Endpoint Directly**
```bash
curl -X POST http://localhost:3002/api/generate-problem \
  -H "Content-Type: application/json" \
  -d '{"type":"algebra","difficulty":"elementary"}'
```

Expected response:
```json
{
  "success": true,
  "problem": {
    "text": "...",
    "type": "algebra",
    "confidence": 0.9
  }
}
```

### **Test 3: Check Console for Detailed Errors**
1. Open browser console
2. Go to Network tab
3. Click "Generate"
4. Look for `/api/generate-problem` request
5. Check response for errors

---

## 📝 Summary

**User Report:**
- Generate Practice Problem button not working
- Console shows many TypeError errors for database loading

**Root Causes:**
1. OpenAI API key not configured OR API request failing
2. TypeError in data loading (possibly from recent `.maybeSingle()` change)

**Priority Fixes:**
1. **HIGH**: Add error display for Generate button
2. **HIGH**: Check/configure OpenAI API key  
3. **MEDIUM**: Fix TypeError logging (add more details)
4. **MEDIUM**: Increase timeout to 30 seconds
5. **LOW**: Verify all data loading functions use `.maybeSingle()` correctly

---

## 🎯 Quick Fix Commands

```bash
# 1. Check if API key is set
cat .env.local | grep OPENAI_API_KEY

# 2. If not set, add it
echo 'OPENAI_API_KEY=sk-your-key-here' >> .env.local

# 3. Restart dev server
# Stop current server (Ctrl+C)
npm run dev

# 4. Test the generate endpoint
curl -X POST http://localhost:3002/api/generate-problem \
  -H "Content-Type: application/json" \
  -d '{"type":"algebra","difficulty":"elementary"}'
```

---

**Let's fix these ASAP!** 🚀

