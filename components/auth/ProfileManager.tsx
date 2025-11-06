"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  createStudentProfile, 
  updateStudentProfile, 
  deleteStudentProfile,
  type CreateStudentProfileInput,
  type UpdateStudentProfileInput,
  type StudentProfile
} from "@/services/studentProfileService";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

export default function ProfileManager() {
  const { profiles, profilesLoading, refreshProfiles, setActiveProfile, activeProfile, loadUserDataFromSupabase } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<StudentProfile | null>(null);
  const [formData, setFormData] = useState<CreateStudentProfileInput>({
    name: "",
    grade_level: "middle",
    difficulty_preference: "middle",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Clear error when profiles successfully load
  useEffect(() => {
    if (!profilesLoading && profiles.length >= 0) {
      setLoadError(null);
    }
  }, [profilesLoading, profiles.length]);

  const resetForm = () => {
    setFormData({
      name: "",
      grade_level: "middle",
      difficulty_preference: "middle",
    });
    setIsCreating(false);
    setEditingProfile(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleEdit = (profile: StudentProfile) => {
    setFormData({
      name: profile.name,
      grade_level: profile.grade_level || "middle",
      difficulty_preference: profile.difficulty_preference || "middle",
    });
    setEditingProfile(profile);
    setIsCreating(false);
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm("Are you sure you want to delete this profile? This action cannot be undone.")) {
      return;
    }

    try {
      setIsSubmitting(true);
      const wasActiveProfile = activeProfile?.id === profileId;
      
      // If deleting active profile, switch to Personal first
      if (wasActiveProfile) {
        await setActiveProfile(null);
        // Wait a bit for the switch to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      await deleteStudentProfile(profileId);
      
      // Refresh profiles to update the list
      await refreshProfiles();
      
      showToast("Profile deleted successfully", "success");
    } catch (error) {
      logger.error("Error deleting profile", { error });
      showToast("Failed to delete profile. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast("Please enter a profile name", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingProfile) {
        // Update existing profile
        await updateStudentProfile(editingProfile.id, formData as UpdateStudentProfileInput);
        showToast("Profile updated successfully", "success");
        // Always refresh profiles to show updated data
        await refreshProfiles();
        // If this was the active profile, reload user data
        if (activeProfile?.id === editingProfile.id) {
          await loadUserDataFromSupabase();
        }
      } else {
        // Create new profile
        const newProfile = await createStudentProfile(formData);
        showToast("Profile created successfully", "success");
        // Refresh profiles first to get the new profile in the list
        await refreshProfiles();
        // Wait a bit for the refresh to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // Then set as active (this will also reload data)
        await setActiveProfile(newProfile.id);
      }
      
      resetForm();
    } catch (error) {
      logger.error("Error saving profile", { error });
      showToast(
        error instanceof Error ? error.message : "Failed to save profile. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show empty state immediately (non-blocking) - don't wait for loading
  // If profiles are loading but we have no profiles yet, show empty state with create button
  if (profilesLoading && profiles.length === 0 && !loadError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Student Profiles
          </h3>
        </div>
        <div className="p-8 text-center border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="mb-4 text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Loading profiles...
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Create Profile (while loading)
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                Failed to Load Profiles
              </h4>
              <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                {loadError}
              </p>
              <button
                onClick={async () => {
                  setLoadError(null);
                  try {
                    await refreshProfiles();
                  } catch (error) {
                    setLoadError("Failed to load profiles. Please check your Supabase connection.");
                  }
                }}
                className="text-sm font-medium text-red-800 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            <strong>Common causes:</strong>
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
            <li>Student profiles table doesn't exist in Supabase</li>
            <li>RLS policies are blocking access</li>
            <li>Supabase connection issue</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Student Profiles
        </h3>
        {!isCreating && !editingProfile && (
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            + Add Profile
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingProfile) && (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Profile Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter student name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grade Level
              </label>
              <select
                value={formData.grade_level || "middle"}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="elementary">Elementary</option>
                <option value="middle">Middle School</option>
                <option value="high">High School</option>
                <option value="advanced">Advanced</option>
                <option value="college">College</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty Preference
              </label>
              <select
                value={formData.difficulty_preference || "middle"}
                onChange={(e) => setFormData({ ...formData, difficulty_preference: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="elementary">Elementary</option>
                <option value="middle">Middle School</option>
                <option value="high">High School</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : editingProfile ? "Update Profile" : "Create Profile"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Profiles List */}
      {profiles.length === 0 && !isCreating && (
        <div className="p-8 text-center border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No student profiles yet. Create one to get started!
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Create First Profile
          </button>
        </div>
      )}

      {profiles.length > 0 && !isCreating && !editingProfile && (
        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-medium text-indigo-700 dark:text-indigo-300">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {profile.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {profile.grade_level ? `${profile.grade_level.charAt(0).toUpperCase() + profile.grade_level.slice(1)} • ` : ""}
                      {profile.difficulty_preference.charAt(0).toUpperCase() + profile.difficulty_preference.slice(1)} difficulty
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(profile)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

