# Testing Student Profiles Feature

This guide will help you test the multiple student profiles functionality.

## Prerequisites

1. ✅ You must be **signed in** (not in guest mode)
2. ✅ The database migration `add_student_profiles.sql` must be run in Supabase
3. ✅ Your Supabase environment variables are configured in `.env.local`

## Step 1: Access Profile Management

1. **Sign in** to your account (or sign up if you don't have one)
2. Click the **Settings** button (gear icon) in the top-right area
3. Click the **"Profiles"** tab in the Settings menu
   - Note: The Profiles tab only appears for logged-in users

## Step 2: Create Your First Student Profile

1. In the Profiles tab, click **"+ Add Profile"** or **"Create First Profile"**
2. Fill in the form:
   - **Profile Name** (required): e.g., "Alice", "John", "Math Student"
   - **Grade Level**: Select from dropdown (Elementary, Middle School, High School, Advanced, College)
   - **Difficulty Preference**: Select from dropdown (Elementary, Middle School, High School, Advanced)
3. Click **"Create Profile"**
4. ✅ You should see:
   - A success toast notification
   - The new profile appears in the list
   - The profile is automatically set as active

## Step 3: Switch Between Profiles

### Method 1: Via User Menu
1. Click your **user avatar/name** in the top-right corner
2. In the dropdown menu, find the **"Student Profiles"** section
3. You'll see:
   - **"Personal"** option (your own profile)
   - All your student profiles listed
4. Click on any profile to switch to it
5. ✅ You should see:
   - A success toast: "Switched to [Profile Name]"
   - The active profile is marked with "Active" badge

### Method 2: Via Profile Switcher (if visible)
- If you have multiple profiles, a profile switcher button may appear
- Click it to see a dropdown of all profiles
- Select a profile to switch

## Step 4: Create Multiple Profiles

1. Go back to **Settings → Profiles** tab
2. Click **"+ Add Profile"** again
3. Create 2-3 more profiles with different names and grade levels
4. ✅ You should see all profiles listed in the Profiles tab

## Step 5: Edit a Profile

1. In the Profiles tab, find a profile you want to edit
2. Click the **"Edit"** button next to the profile
3. Modify any field (name, grade level, difficulty preference)
4. Click **"Update Profile"**
5. ✅ You should see:
   - A success toast notification
   - The profile is updated in the list

## Step 6: Delete a Profile

1. In the Profiles tab, find a profile you want to delete
2. Click the **"Delete"** button (red button)
3. Confirm the deletion in the popup
4. ✅ You should see:
   - A success toast notification
   - The profile is removed from the list
   - If it was the active profile, it switches to "Personal"

## Step 7: Verify Profile Persistence

1. **Sign out** of your account
2. **Sign back in**
3. Go to **Settings → Profiles** tab
4. ✅ Your profiles should still be there (they're saved in the database)

## Step 8: Test Profile Switching Impact (Future)

Currently, profile switching changes which profile is "active", but data queries haven't been updated yet to use the active profile ID. In the future, when you switch profiles:
- Progress tracking (XP, achievements, problems solved) will be separate per profile
- Each profile will have its own learning history
- Settings and preferences will be profile-specific

## Troubleshooting

### Profiles tab doesn't appear
- ✅ Make sure you're **signed in** (not in guest mode)
- ✅ Check browser console for errors
- ✅ Verify Supabase connection is working

### "Failed to create profile" error
- ✅ Check browser console for detailed error
- ✅ Verify `student_profiles` table exists in Supabase
- ✅ Check RLS policies are set correctly
- ✅ Ensure you're signed in

### Profile switcher doesn't show in User Menu
- ✅ Make sure you have at least one student profile created
- ✅ The switcher only appears if `profiles.length > 0`

### Infinite loading / page stuck
- ✅ Check browser console for errors
- ✅ Try refreshing the page
- ✅ Check if `getStudentProfiles()` is throwing an error
- ✅ Verify Supabase environment variables are correct

## Expected Behavior

### When Signed In:
- ✅ Profiles tab appears in Settings menu
- ✅ Can create, edit, delete profiles
- ✅ Profile switcher appears in User Menu (if profiles exist)
- ✅ Can switch between profiles
- ✅ Active profile persists across page refreshes

### When Signed Out:
- ✅ Profiles tab does NOT appear
- ✅ Profile switcher does NOT appear
- ✅ All profile state is cleared

### Database Verification:
You can verify profiles in Supabase:
1. Go to Supabase Dashboard → Table Editor
2. Open `student_profiles` table
3. You should see your created profiles
4. Check `profiles` table → `current_student_profile_id` column to see which profile is active

## Next Steps (Future Implementation)

Once data queries are updated to use active profile ID:
- Each profile will have separate progress tracking
- XP, achievements, and problems solved will be per-profile
- Learning history will be profile-specific
- Settings can be customized per profile

---

**Need Help?** Check the browser console for detailed error messages and logs.

