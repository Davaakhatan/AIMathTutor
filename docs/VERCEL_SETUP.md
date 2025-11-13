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

**IMPORTANT**: You must add the `OPENAI_API_KEY` environment variable before deploying.

1. In the Vercel project setup page, go to **"Environment Variables"** section
2. Click **"Add"** to add a new environment variable
3. Set:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-` or `sk-proj-`)
   - **Environment**: Select all (Production, Preview, Development)
4. Click **"Save"**

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

After deployment, you can verify the API key is configured:

1. Visit `https://your-project.vercel.app/api/health`
2. Check the response - it should show:
   ```json
   {
     "status": "ok",
     "environment": {
       "openaiConfigured": true,
       "apiKeyPresent": true
     }
   }
   ```

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

## Support

If you continue to have issues:
1. Check Vercel build logs for errors
2. Check the `/api/health` endpoint response
3. Verify the API key format and validity
4. Make sure you've redeployed after adding the environment variable

