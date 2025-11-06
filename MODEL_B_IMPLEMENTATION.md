# Model B Implementation Guide

## Overview
This document outlines the implementation of Model B: Students Own Their Profiles, Parents Link to Them.

## Architecture Changes

### Current State (Model A)
- Parent/Teacher account creates multiple student profiles
- Profiles are owned by the parent account (`owner_id = parent's user_id`)
- Only the parent can see/manage profiles

### Target State (Model B)
- Students create their own accounts and get their own profiles
- Student profiles are owned by the student account (`owner_id = student's user_id`)
- Parents/Teachers link to student accounts via `profile_relationships`
- Students see their own data when logged in
- Parents see linked student data when logged in

## Database Schema

### Key Tables

1. **profiles** - User accounts
   - `role`: 'student', 'parent', 'teacher', 'admin'
   - `current_student_profile_id`: For parents, the selected student profile to view

2. **student_profiles** - Student profiles
   - `owner_id`: References the STUDENT's user account (not parent)
   - Each student account has one default profile

3. **profile_relationships** - Links parents to students
   - `parent_id`: Parent/Teacher account
   - `student_profile_id`: Student profile (owned by student)
   - `can_view_progress`, `can_manage_profile`: Permissions

4. **Data tables** (xp_data, streaks, problems, etc.)
   - `user_id`: Student's user account
   - `student_profile_id`: Student's profile (for profile-specific data)

## Implementation Steps

### 1. Database Migration ✅
- Run `supabase/migrations/migrate_to_model_b.sql`
- Adds missing `student_profile_id` columns
- Updates RLS policies for Model B
- Updates helper functions

### 2. Authentication Flow
- [ ] Update `SignUpForm` to include role selection ✅ (Done)
- [ ] Update `AuthContext.signUp` to accept and store role
- [ ] Auto-create student profile when student signs up (trigger handles this)
- [ ] Update profile creation logic

### 3. Profile Services
- [ ] Update `studentProfileService.ts` for Model B
  - Students: Get their own profile
  - Parents: Get linked student profiles via `profile_relationships`
- [ ] Create `profileRelationshipService.ts` ✅ (Done)
  - Link/unlink parent to student
  - Manage permissions

### 4. Data Query Logic
- [ ] Update `supabaseDataService.ts`
  - Students: Query by `user_id` (their own account)
  - Parents: Query by `student_profile_id` (linked student)
- [ ] Update `getEffectiveProfileId` function
  - Students: Return their own profile ID
  - Parents: Return selected student profile ID

### 5. AuthContext Updates
- [ ] Update `loadProfiles`:
  - Students: Load their own profile
  - Parents: Load linked student profiles
- [ ] Update `setActiveProfile`:
  - Students: Set their own profile (usually just one)
  - Parents: Switch between linked students
- [ ] Add `getLinkedStudents` function for parents

### 6. UI Updates

#### Student View
- [ ] Show student's own dashboard
- [ ] Show student's own XP, progress, achievements
- [ ] Show who can view their profile (relationships)

#### Parent View
- [ ] Show list of linked students
- [ ] Allow switching between students
- [ ] Show selected student's data
- [ ] Add "Link Student" button/flow
- [ ] Show permissions for each linked student

### 7. Profile Linking Flow
- [ ] Create UI for parents to link to students
- [ ] Options:
  - Search by student email/username
  - Invite student via email
  - Student approval system (future)
- [ ] Show pending/approved relationships

## Data Flow Examples

### Student Signs Up
1. Student creates account with `role = 'student'`
2. Trigger `create_default_student_profile()` runs
3. Creates `student_profile` with `owner_id = student's user_id`
4. Sets `profiles.current_student_profile_id` to new profile
5. Student can now log in and see their own data

### Parent Links to Student
1. Parent searches for student (by email/username)
2. Parent creates `profile_relationship`
3. Parent can now see student in their linked students list
4. Parent can switch to student view
5. Parent sees student's data based on permissions

### Student Views Their Data
1. Student logs in
2. `getActiveStudentProfile()` returns their profile
3. All queries use `user_id = student's id` OR `student_profile_id = student's profile id`
4. Student sees their own XP, progress, achievements, etc.

### Parent Views Student Data
1. Parent logs in
2. Parent selects a linked student
3. `getActiveStudentProfile()` returns selected student's profile
4. All queries use `student_profile_id = selected student's profile id`
5. Parent sees student's data (based on permissions)

## RLS Policy Logic

### Students
- Can view/update their own profile
- Can view their own data (xp_data, streaks, problems, etc.)
- Can view relationships where they are the student

### Parents
- Can view their own profile
- Can view linked student profiles (via `profile_relationships`)
- Can update linked student profiles (if `can_manage_profile = true`)
- Can view linked student data (if `can_view_progress = true`)

## Testing Checklist

- [ ] Student can sign up and get default profile
- [ ] Student can see their own data
- [ ] Parent can sign up
- [ ] Parent can link to student account
- [ ] Parent can view linked student data
- [ ] Parent can switch between linked students
- [ ] Parent permissions work correctly
- [ ] Student can see who has access to their profile
- [ ] Data isolation: Students only see their own data
- [ ] Data isolation: Parents only see linked student data

## Migration Notes

⚠️ **Important**: Existing data in Model A format needs migration:
- If you have existing parent-owned profiles, you'll need to:
  1. Create student accounts for each profile
  2. Transfer profile ownership to student accounts
  3. Create relationships between parents and students
  4. Migrate data from parent-owned to student-owned

This migration script doesn't handle existing data - it only sets up the schema for new Model B usage.

