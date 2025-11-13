# Vercel Deployment Guide

This guide will help you deploy the AI Math Tutor to Vercel and configure the OpenAI API key.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- A GitHub repository with your code
- An OpenAI API key (get from https://platform.openai.com/api-keys)

## Deployment Steps

### 1. Connect Your Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### 2. Configure Environment Variables

**IMPORTANT**: You must add ALL required environment variables before deploying.

#### Required Environment Variables:

1. **OpenAI API Key** (for AI features):
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-` or `sk-proj-`)
   - **Environment**: Select all (Production, Preview, Development)

2. **Supabase Configuration** (for database, auth, XP, history):
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Environment**: Select all
   
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase anonymous/public key
   - **Environment**: Select all
   
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your Supabase service role key (⚠️ Keep this secret!)
   - **Environment**: Select all

#### How to Add Environment Variables:

1. In the Vercel project setup page, go to **"Environment Variables"** section
2. Click **"Add"** for each variable
3. Enter the name and value
4. Select **all environments** (Production, Preview, Development)
5. Click **"Save"** for each variable

#### Where to Find Supabase Keys:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Secret - don't expose in client code)

### 3. Deploy

1. Click **"Deploy"** button
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Troubleshooting

### Issue: App Still Asks for API Key After Adding It

**Solution**: 
1. Make sure you added `OPENAI_API_KEY` (not `NEXT_PUBLIC_OPENAI_API_KEY`)
2. **Redeploy** the app after adding the environment variable:
   - Go to your project in Vercel Dashboard
   - Click "Deployments" tab
   - Click the "..." menu on the latest deployment
   - Click "Redeploy"
3. Wait for the new deployment to complete
4. Clear your browser cache and hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: API Key Not Working

**Check**:
1. Verify the API key is correct (no leading/trailing spaces)
2. Make sure it starts with `sk-` or `sk-proj-`
3. Check your OpenAI account has credits/quota
4. Verify the environment variable is set for all environments (Production, Preview, Development)

### Issue: Build Fails

**Check**:
1. Make sure all dependencies are in `package.json`
2. Check build logs in Vercel Dashboard for specific errors
3. Ensure Node.js version is 18+ (Vercel auto-detects this)

## Verifying the Setup

After deployment, verify all environment variables are configured:

1. Visit `https://your-project.vercel.app/api/health`
2. Check the response - it should show:
   ```json
   {
     "status": "ok",
     "environment": {
       "openaiConfigured": true,
       "apiKeyPresent": true,
       "envVarsValid": true
     }
   }
   ```

3. **Test XP System**:
   - Solve a problem
   - Check if XP is added (should see in Recent Activity)
   - If XP doesn't add, check Vercel function logs for Supabase errors

4. **Test Problem History**:
   - Solve a problem
   - Go to Learning Hub → History
   - Problem should appear in "All" and "Solved" tabs
   - If not, check browser console and Vercel function logs

## Alternative: Using Settings Panel

If you prefer not to set environment variables, you can:
1. Open the deployed app
2. Click the Settings icon (gear)
3. Enter your OpenAI API key in the "OpenAI API Key" field
4. The key will be stored in your browser's localStorage

**Note**: This is less secure and requires each user to enter their own key.

## Updating Environment Variables

To update the API key later:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit the `OPENAI_API_KEY` value
3. Redeploy the app (or it will update on the next deployment)

## Common Issues

### Issue: XP Not Adding / History Not Working / Problems Not Saving

**This means Supabase environment variables are missing or incorrect.**

**Solution**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all three Supabase variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Redeploy** after adding/updating variables:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"
4. Check Vercel function logs for errors:
   - Go to your project → Functions tab
   - Look for errors related to Supabase connection
5. Verify Supabase keys are correct:
   - Go to Supabase Dashboard → Settings → API
   - Compare the keys with what's in Vercel

### Issue: App Still Asks for API Key After Adding It

**Solution**: 
1. Make sure you added `OPENAI_API_KEY` (not `NEXT_PUBLIC_OPENAI_API_KEY`)
2. **Redeploy** the app after adding the environment variable
3. Clear your browser cache and hard refresh

### Issue: API Key Not Working

**Check**:
1. Verify the API key is correct (no leading/trailing spaces)
2. Make sure it starts with `sk-` or `sk-proj-`
3. Check your OpenAI account has credits/quota
4. Verify the environment variable is set for all environments

### Issue: Build Fails

**Check**:
1. Make sure all dependencies are in `package.json`
2. Check build logs in Vercel Dashboard for specific errors
3. Ensure Node.js version is 18+ (Vercel auto-detects this)

## Support

If you continue to have issues:
1. Check Vercel build logs for errors
2. Check the `/api/health` endpoint response
3. Check Vercel function logs (Functions tab) for runtime errors
4. Verify all environment variables are set correctly
5. Make sure you've redeployed after adding/updating environment variables
6. Check browser console for client-side errors

