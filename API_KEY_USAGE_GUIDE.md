# OpenAI API Key Usage Guide
## How API Keys Work in Local and Deployed Versions

---

## 🎯 Overview

The app supports **two ways** to provide the OpenAI API key:

1. **Environment Variable** (Recommended for deployed apps)
   - Set `OPENAI_API_KEY` in AWS Amplify/Vercel environment variables
   - Works automatically, no user input needed

2. **Client-Provided Key** (Fallback option)
   - Enter API key in Settings panel
   - Stored in browser localStorage
   - Used as fallback when environment variable isn't available

---

## 📋 How It Works

### Priority Order

The app uses API keys in this priority:

1. **First**: Environment variable (`OPENAI_API_KEY`)
   - Checked automatically on server
   - Used if available

2. **Fallback**: Client-provided key (from Settings)
   - Sent with each API request
   - Used only if environment variable is missing

### API Endpoints That Support Client-Provided Keys

All API endpoints now accept an optional `apiKey` in the request body:

- ✅ `/api/chat` - Chat messages
- ✅ `/api/parse-problem` - Problem parsing (text/image)
- ✅ `/api/generate-problem` - Problem generation
- ✅ `/api/hint` - Progressive hints

---

## 🚀 Local Development

### Option 1: Environment Variable (Recommended)

1. Create `.env.local` file in project root:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

3. The app will use this key automatically.

### Option 2: Settings Panel (Fallback)

1. Run the app: `npm run dev`
2. Click **Settings** (gear icon, top right)
3. Scroll to **"OpenAI API Key"**
4. Enter your API key
5. Key is saved automatically in browser localStorage
6. Will be used if `.env.local` is missing

---

## 🌐 Deployed Version (AWS Amplify/Vercel)

### Option 1: Environment Variable (Recommended)

**AWS Amplify:**
1. Go to AWS Amplify Console
2. Select your app
3. **App settings** → **Environment variables**
4. Add: `OPENAI_API_KEY` = `sk-your-api-key-here`
5. **Redeploy** the app (critical!)

**Vercel:**
1. Go to Vercel Dashboard
2. Select your project
3. **Settings** → **Environment Variables**
4. Add: `OPENAI_API_KEY` = `sk-your-api-key-here`
5. Select environments: Production, Preview, Development
6. **Redeploy** the app

### Option 2: Settings Panel (Fallback)

If environment variable isn't working:

1. Visit your deployed app
2. Click **Settings** (gear icon)
3. Enter your API key
4. Key is saved in browser localStorage
5. Will be used for all API requests

**Note**: This is per-user, per-browser. Each user needs to enter their own key.

---

## 🔍 How to Verify It's Working

### Check Health Endpoint

Visit: `https://your-app-url/api/health`

Look for:
```json
{
  "environment": {
    "apiKeyPresent": true,
    "openaiConfigured": true
  }
}
```

If `apiKeyPresent: false`, the environment variable isn't set.

### Test the App

1. Try entering a problem (e.g., "2x + 5 = 13")
2. If it works, the API key is configured correctly
3. If you see "OpenAI API configuration error", check:
   - Environment variable is set (for deployed)
   - API key in Settings is correct (for local/client fallback)

---

## 🐛 Troubleshooting

### Issue: "Session expired" Error

This is **NOT** an API key issue. It means:
- Your session timed out (30 minutes)
- Start a new conversation

### Issue: "OpenAI API configuration error"

**On Local:**
- Check `.env.local` file exists and has correct key
- OR enter key in Settings panel

**On Deployed:**
- Verify environment variable is set in Amplify/Vercel
- **Redeploy** after adding the variable
- OR enter key in Settings panel as fallback

### Issue: API Key Not Working

1. **Check key format**: Should start with `sk-` (OpenAI) or `sk-proj-` (OpenAI organization)
2. **Verify key is active**: Check at https://platform.openai.com/api-keys
3. **Check key permissions**: Ensure it has access to GPT-4 models
4. **Check usage limits**: Verify you have credits/quota available

---

## 📝 Code Implementation

### How Client-Provided Keys Are Sent

All API requests include the key if available:

```typescript
// Example: Chat request
fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    sessionId,
    message,
    apiKey: settings.apiKey, // From Settings if available
  }),
});
```

### How Server Uses Keys

```typescript
// Server-side: API route
const clientApiKey = body.apiKey; // From request

// Use client key if provided, otherwise use env var
const client = clientApiKey 
  ? createOpenAIClient(clientApiKey)
  : openai; // Uses process.env.OPENAI_API_KEY
```

---

## ✅ Best Practices

1. **For Production**: Always use environment variables
   - More secure (not exposed to client)
   - Consistent across all users
   - No user action needed

2. **For Development**: Use `.env.local`
   - Keep keys out of version control
   - Easy to manage

3. **Client-Provided Keys**: Use as fallback only
   - When env vars aren't working
   - For quick testing
   - Not recommended for production

---

## 🔒 Security Notes

- **Environment variables** are never exposed to the client
- **Client-provided keys** are stored in browser localStorage only
- **Client-provided keys** are sent over HTTPS (same as any API request)
- **Never commit** API keys to Git
- Keys in `.env.local` are ignored by Git (already in `.gitignore`)

---

## 📚 Quick Reference

| Location | Setup Method | Key Location |
|----------|-------------|--------------|
| **Local** | `.env.local` | `OPENAI_API_KEY=sk-...` |
| **Local** | Settings Panel | Browser localStorage |
| **AWS Amplify** | Environment Variables | `OPENAI_API_KEY` in Amplify Console |
| **Vercel** | Environment Variables | `OPENAI_API_KEY` in Vercel Dashboard |
| **Deployed** | Settings Panel | Browser localStorage (per user) |

---

**Summary**: The app works with either method. Use environment variables for production, and Settings panel as a fallback when needed.

