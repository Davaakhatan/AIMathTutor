# Troubleshooting Authentication Errors

## Common 400 Errors and Solutions

### Error: `AuthApiError` with HTTP 400

This usually means the request format is correct but Supabase rejected it. Common causes:

---

## 1. Email Confirmation Required

**Symptom:** Sign up succeeds but sign in fails with 400 error

**Solution:**
1. Go to Supabase Dashboard
2. **Authentication** → **Settings**
3. Find **"Enable email confirmations"**
4. **Toggle it OFF** (for development)
5. Or check your email and click verification link

---

## 2. Invalid Email Format

**Symptom:** 400 error on sign up

**Check:**
- Email must be valid format: `user@domain.com`
- No spaces or special characters (except @ and .)
- Try a different email format

---

## 3. Password Requirements Not Met

**Symptom:** 400 error on sign up

**Requirements:**
- Minimum 6 characters (default Supabase setting)
- If your Supabase project has stricter requirements, check:
  - Supabase Dashboard → **Authentication** → **Settings** → **Password**

**Solution:**
- Use a password with at least 6 characters
- Include uppercase, lowercase, numbers if required

---

## 4. Rate Limiting

**Symptom:** 400 error after multiple attempts

**Solution:**
- Wait a few minutes
- Check Supabase Dashboard → **Authentication** → **Rate Limits**
- Adjust rate limits if needed

---

## 5. Project Configuration Issues

**Symptom:** 400 error on all auth attempts

**Check:**
1. **Project Status:**
   - Go to Supabase Dashboard
   - Verify project is **Active** (not paused)
   - Check project is not over quota

2. **Environment Variables:**
   ```bash
   # Verify these are set correctly
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **URL Configuration:**
   - Supabase Dashboard → **Authentication** → **URL Configuration**
   - Add your localhost URL to **Redirect URLs**:
     ```
     http://localhost:3002
     http://localhost:3002/**
     ```

---

## 6. Check Actual Error Message

The error object contains more details. Check browser console for:

```javascript
// Full error object
{
  message: "User already registered",
  status: 400,
  name: "AuthApiError"
}
```

Common error messages:
- `"User already registered"` → User exists, use Sign In instead
- `"Email not confirmed"` → Check email and verify
- `"Invalid login credentials"` → Wrong email/password
- `"Password should be at least 6 characters"` → Password too short

---

## Quick Debug Steps

1. **Open Browser Console** (F12)
2. **Try to sign up/sign in**
3. **Look for error details:**
   ```javascript
   Sign up error details: { message: "...", status: 400, ... }
   ```
4. **Check Network Tab:**
   - Look at the actual request to `/auth/v1/signup`
   - Check the response body for error details

---

## Test with Supabase Dashboard

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add user"** button
3. Manually create a user
4. Try signing in with that user
5. If it works, the issue is with sign-up flow
6. If it doesn't, the issue is with Supabase configuration

---

## Verify Environment Variables

Run this in your terminal:
```bash
# Check if variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)"
```

If they're `undefined`, restart your dev server after adding to `.env.local`.

---

## Still Not Working?

1. **Check Supabase Logs:**
   - Dashboard → **Logs** → **API Logs**
   - Look for authentication errors

2. **Test with Supabase Client Directly:**
   ```javascript
   // In browser console
   const { createClient } = await import('@supabase/supabase-js');
   const supabase = createClient(
     'YOUR_URL',
     'YOUR_ANON_KEY'
   );
   const { data, error } = await supabase.auth.signUp({
     email: 'test@example.com',
     password: 'test123'
   });
   console.log('Result:', { data, error });
   ```

3. **Check Supabase Status:**
   - Visit https://status.supabase.com
   - Verify no service outages

---

## Most Common Fix

**90% of 400 errors are due to email confirmation:**

1. Disable email confirmation in Supabase Dashboard
2. Or verify your email after sign up
3. Then try signing in

---

**Need more help?** Check the browser console for the full error message and share it!

