# Fix: Environment Variable Not Working on Deployed App

## 🚨 Problem

App works locally but deployed Amplify/Vercel still asks for API key, even though you added `OPENAI_API_KEY` to environment variables.

---

## ✅ Step-by-Step Fix

### For AWS Amplify:

#### Step 1: Verify Environment Variable is Set Correctly

1. **Go to AWS Amplify Console**
   - https://console.aws.amazon.com/amplify
   - Select your app: **AIMathTutor**

2. **Navigate to Environment Variables**
   - Left sidebar → **App settings** → **Environment variables** (under Hosting)
   - OR: **App settings** → **Branch settings** → Click **main** branch → **Environment variables**

3. **Check the Variable**:
   - ✅ **Name**: Must be exactly `OPENAI_API_KEY` (case-sensitive, no spaces)
   - ✅ **Value**: Should start with `sk-` and be your full API key
   - ✅ **Scope**: Should be set for **"All branches"** or at least **"main"** branch

#### Step 2: Redeploy (CRITICAL!)

**Environment variables require a NEW deployment to take effect.**

1. **Go to Deployments** tab
2. **Click "Redeploy this version"** on the latest deployment
3. **OR** push a new commit to trigger automatic redeploy:
   ```bash
   git commit --allow-empty -m "Trigger redeploy after env var update"
   git push
   ```

4. **Wait for build to complete** (3-5 minutes)

#### Step 3: Verify After Redeploy

1. **Check Health Endpoint**:
   ```
   https://your-app-url.amplifyapp.com/api/health
   ```

2. **Look for**:
   ```json
   {
     "environment": {
       "apiKeyPresent": true,
       "apiKeyLength": 51,
       "openaiConfigured": true
     }
   }
   ```

3. **If you see** `"apiKeyPresent": false`, the environment variable is still not accessible.

---

### For Vercel:

#### Step 1: Verify Environment Variable

1. **Go to Vercel Dashboard**
   - https://vercel.com
   - Select your project: **AIMathTutor**

2. **Navigate to Settings → Environment Variables**

3. **Check the Variable**:
   - ✅ **Name**: `OPENAI_API_KEY` (exact match)
   - ✅ **Value**: Your full API key
   - ✅ **Environments**: Check **Production**, **Preview**, and **Development**

#### Step 2: Redeploy

1. **Go to Deployments** tab
2. **Click the "..." menu** on latest deployment
3. **Select "Redeploy"**
4. **Wait for deployment** (2-3 minutes)

---

## 🔍 Common Issues

### Issue 1: Variable Not Set for Correct Environment

**Problem**: Variable exists but only for wrong branch/environment

**Fix**:
- AWS Amplify: Set for **"All branches"** or at least **"main"**
- Vercel: Enable for **Production** environment

### Issue 2: Typo in Variable Name

**Problem**: Variable name has typo or wrong case

**Fix**:
- Must be exactly: `OPENAI_API_KEY`
- No spaces, no extra characters
- Case-sensitive

### Issue 3: Didn't Redeploy After Adding Variable

**Problem**: Variable added but app not redeployed

**Fix**:
- **CRITICAL**: Environment variables only take effect after redeployment
- Click "Redeploy" or push a new commit

### Issue 4: Variable Value is Wrong

**Problem**: API key value is incorrect or incomplete

**Fix**:
- Get your API key from: https://platform.openai.com/api-keys
- Make sure it starts with `sk-`
- Copy the entire key (no spaces, no line breaks)

### Issue 5: Build vs Runtime Environment Variables

**Problem**: Some platforms need env vars at build time

**Fix**: 
- Make sure variable is available during **both** build and runtime
- AWS Amplify: Set at app level (not just branch level)
- Vercel: Set for all environments

---

## 🧪 Testing Checklist

After redeploying, verify:

- [ ] Environment variable name is exactly `OPENAI_API_KEY`
- [ ] Variable value is correct (starts with `sk-`)
- [ ] Variable is set for correct environment/branch
- [ ] App has been **redeployed** after adding variable
- [ ] `/api/health` returns `"apiKeyPresent": true`
- [ ] Browser console shows no 500 errors
- [ ] Can upload problem images
- [ ] Chat initializes successfully
- [ ] Tutor responds to messages

---

## 📊 Quick Diagnostic

Visit your deployed app's health endpoint:
```
https://your-app-url.amplifyapp.com/api/health
```

**If `apiKeyPresent: false`**:
- Variable not set correctly
- Variable not accessible at runtime
- Need to redeploy

**If `apiKeyPresent: true` but `openaiConfigured: false`**:
- Variable exists but client initialization failed
- Check API key value is correct

---

## 🎯 Most Common Solution

**90% of the time**, the issue is:
1. ✅ Variable is set correctly
2. ❌ **App wasn't redeployed after adding variable**

**Solution**: Redeploy the app!

---

**Next Steps**: 
1. Verify variable is set correctly
2. **Redeploy the app** (most important!)
3. Check `/api/health` endpoint
4. Test the application

