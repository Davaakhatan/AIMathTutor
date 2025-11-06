# How to Sign Up and Sign In 🚀

## Quick Start Guide

### Step 1: Set Up Environment Variables

First, make sure you have your Supabase credentials configured:

1. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project: `supabase-ai-math-tutor`
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL** (e.g., `https://kxdinqtwnkmublxpqhhl.supabase.co`)
     - **anon/public key** (starts with `eyJ...`)

2. **Create `.env.local` file** in the project root:
   ```bash
   # Create the file
   touch .env.local
   ```

3. **Add your credentials** to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://kxdinqtwnkmublxpqhhl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

4. **Restart your dev server** after adding environment variables:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev:3002
   ```

---

## Step 2: Sign Up (Create Account)

### Option A: From Landing Page
1. Open the app in your browser: `http://localhost:3002`
2. Click **"Get Started Free"** button (large blue button)
3. Fill in the form:
   - **Username** (optional): e.g., `johndoe`
   - **Email**: e.g., `john@example.com`
   - **Password**: At least 6 characters
   - **Confirm Password**: Must match
4. Click **"Sign Up"** button
5. **Check your email** for verification link (if email confirmation is enabled)

### Option B: From Guest Mode
1. Click **"Try as Guest"** on landing page
2. Click **"Sign Up to Save Progress"** button (top right)
3. Fill in the sign-up form
4. Click **"Sign Up"**

### Option C: From Sign In Modal
1. Click **"Sign In"** button (top right)
2. Click **"Sign up"** link at the bottom of the modal
3. Fill in the form and submit

---

## Step 3: Sign In (Login)

### Method 1: Direct Sign In
1. Click **"Sign In"** button (top right corner)
2. Enter your credentials:
   - **Email**: The email you used to sign up
   - **Password**: Your password
3. Click **"Sign In"** button

### Method 2: From Landing Page
1. On the landing page, click **"Sign In"** button (top right)
2. Enter email and password
3. Click **"Sign In"**

---

## Troubleshooting

### ❌ "Missing Supabase environment variables"
**Solution:**
1. Check that `.env.local` exists in project root
2. Verify all 3 variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Restart dev server after adding variables

### ❌ "Failed to sign up" / "Failed to sign in"
**Possible causes:**
1. **Email confirmation required:**
   - Check your email inbox (including spam)
   - Click the verification link
   - Then try signing in

2. **Supabase configuration:**
   - Go to Supabase Dashboard → **Authentication** → **Settings**
   - Check **"Enable email confirmations"** setting
   - If enabled, you must verify email before signing in

3. **Password too weak:**
   - Password must be at least 6 characters
   - Try a stronger password

4. **User already exists:**
   - If email already registered, use **"Sign In"** instead
   - Or use **"Forgot Password"** to reset

### ❌ "AuthApiError" in console
**Solution:**
1. Check browser console for specific error message
2. Verify Supabase project is active (not paused)
3. Check Supabase Dashboard → **Authentication** → **Users** to see if user was created
4. Verify environment variables are correct

### ❌ Can't see sign up/sign in buttons
**Solution:**
1. Clear browser cache and refresh
2. Check that `AuthProvider` is wrapping the app (should be in `app/page.tsx`)
3. Check browser console for errors

---

## Verify It's Working

### Check User Created:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Users**
4. You should see your new user in the list

### Check Profile Created:
1. In Supabase Dashboard, go to **Table Editor**
2. Open `profiles` table
3. You should see a profile for your user (auto-created by trigger)

### Check in App:
1. After signing in, you should see:
   - **User menu** (avatar/name) instead of "Sign In/Sign Up" buttons
   - **No "Guest Mode" banner**
   - Your progress will be saved to cloud

---

## Email Confirmation Settings

### Disable Email Confirmation (For Testing):
1. Go to Supabase Dashboard
2. **Authentication** → **Settings**
3. Find **"Enable email confirmations"**
4. Toggle it **OFF** (for development/testing)
5. Users can sign in immediately after sign up

### Enable Email Confirmation (For Production):
1. Keep **"Enable email confirmations"** **ON**
2. Users must verify email before signing in
3. Configure email templates in **Authentication** → **Email Templates**

---

## Quick Test

1. **Sign Up:**
   ```
   Email: test@example.com
   Password: test123
   ```

2. **Sign In:**
   ```
   Email: test@example.com
   Password: test123
   ```

3. **Check Supabase Dashboard** → **Authentication** → **Users** to verify user was created

---

## Need Help?

If you're still having issues:
1. Check browser console for error messages
2. Check Supabase Dashboard → **Logs** for server-side errors
3. Verify all environment variables are set correctly
4. Make sure Supabase project is not paused

---

**Happy Learning! 🎓**

