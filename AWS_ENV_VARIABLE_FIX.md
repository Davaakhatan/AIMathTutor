# Fix: 500 Errors on AWS Amplify - Missing API Key

## 🚨 Problem

The app is deployed but returning **500 errors** on API calls:
- `/api/chat` - 500 error
- `/api/generate-problem` - 500 error

**Root Cause**: `OPENAI_API_KEY` environment variable is not properly set or accessible in AWS Amplify.

---

## ✅ Quick Fix Steps

### Step 1: Verify Environment Variable in AWS Amplify

1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify
   - Select your app: **AIMathTutor**

2. **Check Environment Variables**
   - Click: **App settings** → **Environment variables** (under Hosting)
   - OR: **App settings** → **Branch settings** → Click on **main** branch → **Environment variables**

3. **Verify OPENAI_API_KEY exists**
   - Look for: `OPENAI_API_KEY`
   - Check that it has a value (should start with `sk-`)
   - Check it's set for **"All branches"** or at least for **"main"** branch

### Step 2: Add/Update Environment Variable

If `OPENAI_API_KEY` is missing or incorrect:

1. **Click "Manage variables"** or **"Add environment variable"**

2. **Add the variable**:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)
   - **Scope**: Select **"All branches"** (or at least "main")

3. **Click "Save"**

### Step 3: Redeploy

After adding/updating the environment variable:

1. **Go to Deployments** tab
2. **Click "Redeploy this version"** on the latest deployment
3. **Wait for build to complete** (3-5 minutes)

**OR** just push a new commit to trigger automatic redeploy:
```bash
git commit --allow-empty -m "Trigger redeploy after env var update"
git push
```

---

## 🔍 Verify Environment Variable is Set

### Option 1: Check Health Endpoint

After redeploying, visit:
```
https://main.d2tm8y1va0rma8.amplifyapp.com/api/health
```

You should see:
```json
{
  "status": "ok",
  "environment": {
    "envVarsValid": true,
    "missingEnvVars": [],
    "openaiConfigured": true
  }
}
```

If you see `"envVarsValid": false` or `"openaiConfigured": false`, the environment variable is not set correctly.

### Option 2: Check Build Logs

In AWS Amplify Console → Deployments → Click on deployment → Build logs

Look for any errors related to:
- `OPENAI_API_KEY`
- `Environment variable`
- `API key not configured`

---

## 🐛 Common Issues

### Issue 1: Variable Not Set for Correct Branch

**Problem**: Variable is set but only for wrong branch/environment

**Solution**: 
- Make sure variable is set for **"All branches"** or at least **"main"** branch
- Check branch-specific overrides

### Issue 2: Variable Name Wrong

**Problem**: Variable name has typo or wrong case

**Solution**:
- Must be exactly: `OPENAI_API_KEY` (case-sensitive)
- No spaces, no extra characters

### Issue 3: Variable Value Wrong

**Problem**: API key value is incorrect or incomplete

**Solution**:
- Get your API key from: https://platform.openai.com/api-keys
- Make sure it starts with `sk-`
- Copy the entire key (no spaces)

### Issue 4: Need to Redeploy After Adding Variable

**Problem**: Variable added but app not redeployed

**Solution**:
- Environment variables require a **new deployment** to take effect
- Click "Redeploy this version" or push a new commit

---

## 📋 Checklist

Before considering the issue fixed, verify:

- [ ] `OPENAI_API_KEY` exists in AWS Amplify environment variables
- [ ] Variable value is correct (starts with `sk-`)
- [ ] Variable is set for "All branches" or "main" branch
- [ ] App has been redeployed after adding/updating variable
- [ ] `/api/health` endpoint returns `"envVarsValid": true`
- [ ] Browser console shows no 500 errors
- [ ] Chat functionality works (can send messages)

---

## 🎯 Expected Behavior After Fix

Once the environment variable is properly set and app is redeployed:

1. ✅ `/api/health` returns 200 with `"openaiConfigured": true`
2. ✅ No 500 errors in browser console
3. ✅ Can upload problem images
4. ✅ Can enter text problems
5. ✅ Chat initializes successfully
6. ✅ Tutor responds to messages

---

## 💡 Alternative: Check Build Logs for Errors

If the issue persists after setting the environment variable:

1. Go to AWS Amplify → Deployments
2. Click on the latest deployment
3. Scroll through build logs
4. Look for:
   - `OPENAI_API_KEY` mentions
   - Error messages
   - TypeScript/build errors
   - Environment variable warnings

---

**Current Status**: App is deployed but API key is missing/not accessible. Fix by adding `OPENAI_API_KEY` to AWS Amplify environment variables and redeploying.

