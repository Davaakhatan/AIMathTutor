# Vercel Deployment Setup Guide
## Quick Fix for OpenAI API Key Error

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Access Vercel Project Settings

1. Go to [vercel.com](https://vercel.com) and log in
2. Navigate to your **AIMathTutor** project
3. Click on **Settings** (gear icon)

### Step 2: Add Environment Variable

1. In the Settings menu, click on **Environment Variables** (left sidebar)
2. Click **Add New** or the **+** button

3. Add the following variable:

   **Variable Name:**
   ```
   OPENAI_API_KEY
   ```

   **Value:**
   ```
   sk-your-actual-openai-api-key-here
   ```
   *(Replace with your actual OpenAI API key from https://platform.openai.com/api-keys)*

   **Environments:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development
   
   *(Select all three to ensure it works everywhere)*

4. Click **Save**

### Step 3: Redeploy

After adding the environment variable:

1. Go to the **Deployments** tab
2. Find the latest deployment (or create a new one)
3. Click the **...** (three dots) menu
4. Select **Redeploy**
5. Or push a new commit to trigger automatic redeploy

---

## ✅ Verification

After redeploying, verify the API key is working:

1. Visit your deployed site
2. Try entering a math problem (e.g., `2x + 5 = 13`)
3. Check browser console for errors
4. If you see "Failed to process message" or API errors, verify:
   - Environment variable name is exactly `OPENAI_API_KEY` (case-sensitive)
   - The API key value is correct (starts with `sk-`)
   - The variable is enabled for the environment you're testing

---

## 🔍 Troubleshooting

### Issue: "OpenAI API Key is not set"

**Error Message:**
```
OPENAI_API_KEY is not set in environment variables
```

**Solution:**
1. Double-check the environment variable name is exactly `OPENAI_API_KEY`
2. Ensure it's added to the correct environment (Production/Preview)
3. Redeploy after adding the variable

### Issue: "Invalid API Key"

**Error Message:**
```
401 Unauthorized
```

**Solution:**
1. Verify your API key is correct at https://platform.openai.com/api-keys
2. Check that your OpenAI account has credits
3. Ensure the API key has access to GPT-4 models

### Issue: "Rate Limit Exceeded"

**Error Message:**
```
429 Too Many Requests
```

**Solution:**
1. Check your OpenAI usage limits
2. Wait a few minutes and try again
3. Consider upgrading your OpenAI plan

---

## 📝 Environment Variable Checklist

Before deploying, ensure:

- [ ] `OPENAI_API_KEY` is set in Vercel
- [ ] Variable is enabled for Production environment
- [ ] Variable is enabled for Preview environment (optional but recommended)
- [ ] API key is valid and has credits
- [ ] API key has access to GPT-4 models

---

## 🔐 Security Best Practices

1. **Never commit API keys to Git**
   - ✅ Already handled: `.env.local` is in `.gitignore`
   - ✅ API keys should only be in Vercel environment variables

2. **Use different keys for different environments** (optional)
   - Production: Main API key
   - Preview: Test API key (if you have one)

3. **Rotate keys periodically**
   - If a key is compromised, regenerate it in OpenAI
   - Update it in Vercel environment variables

---

## 🎯 Quick Reference

**Vercel Settings Path:**
```
Project → Settings → Environment Variables
```

**OpenAI API Key Location:**
```
https://platform.openai.com/api-keys
```

**Required Environment Variable:**
```
OPENAI_API_KEY=sk-...
```

---

## ✨ After Setup

Once the environment variable is set:

1. ✅ Your app should work on the deployed URL
2. ✅ Problem parsing will work (text + images)
3. ✅ Socratic dialogue will function
4. ✅ Math rendering will display correctly

**Test it:**
- Enter a problem: `2x + 5 = 13`
- Or upload an image of a math problem
- Start a conversation with the tutor

---

## 🆘 Still Having Issues?

If you're still seeing errors:

1. **Check Vercel Logs:**
   - Go to your deployment
   - Click on "Functions" tab
   - Check the logs for specific error messages

2. **Verify Code:**
   - The code checks for `process.env.OPENAI_API_KEY`
   - Make sure variable name matches exactly

3. **Test Locally First:**
   - Ensure `.env.local` has your API key
   - Test locally before deploying
   - If local works, it's likely a Vercel env var issue

---

**You're all set!** Once the environment variable is added and you redeploy, your app should work perfectly on Vercel. 🚀

