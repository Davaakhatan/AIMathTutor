# How to Find Environment Variables in AWS Amplify

## Current Location: IAM roles
You're currently on: **App settings → IAM roles**

## Where to Find Environment Variables

### Option 1: Branch Settings (Recommended)

1. **In the left sidebar**, look for "App settings"
2. **Click**: "Branch settings" (under App settings)
3. **Click on**: "main" branch (or your branch name)
4. **Scroll down** to find "Environment variables" section
5. **Click**: "Manage variables" or "Add environment variable"

### Option 2: General Settings

1. **In the left sidebar**, under "App settings"
2. **Click**: "General settings"
3. **Scroll down** to find "Environment variables" section
4. **Click**: "Manage variables" or "Add environment variable"

---

## Step-by-Step Navigation

```
AWS Amplify Console
├── AIMathTutor (your app)
    ├── Overview
    ├── Hosting
    ├── Monitoring
    └── App settings ← You are here
        ├── General settings ← Try this first
        │   └── Environment variables ← HERE!
        ├── Branch settings ← Or try this
        │   └── main (click on branch)
        │       └── Environment variables ← OR HERE!
        └── IAM roles ← You're currently here
```

---

## Quick Steps

1. **Click** "Branch settings" in the left sidebar (under App settings)
2. **Click** on "main" branch
3. **Scroll down** to "Environment variables"
4. **Click** "Manage variables" or the "+" button
5. **Add**:
   - Key: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
6. **Save**

---

## Alternative: Direct URL

You can also navigate directly by:
- Going to: `https://us-east-2.console.aws.amazon.com/amplify/apps/d1hd4moqyoxyj8/branches/main/environment-variables`
- Replace `d1hd4moqyoxyj8` with your actual App ID if different

---

**Note**: Environment variables are set per branch, so make sure you're adding it to the "main" branch (or whichever branch you're deploying).

