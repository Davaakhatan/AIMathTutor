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
  const { profiles, profilesLoading, refreshProfiles, setActiveProfile, activeProfile, loadUserDataFromSupabase, userRole, user } = useAuth();
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
      
      if (wasActiveProfile) {
        await setActiveProfile(null);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      await deleteStudentProfile(profileId, user?.id);
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
        const updatedProfile = await updateStudentProfile(editingProfile.id, formData as UpdateStudentProfileInput, user?.id);
        showToast("Profile updated successfully", "success");
        await refreshProfiles();
        if (activeProfile?.id === editingProfile.id) {
          await loadUserDataFromSupabase();
        }
        resetForm();
      } else {
        // Create new profile
        logger.info("Creating profile", { formData, userRole, userId: user?.id });
        console.log("Starting profile creation...", { formData, userRole, userId: user?.id });

        const newProfile = await createStudentProfile(formData, user?.id);
        
        logger.info("Profile created successfully", { profileId: newProfile.id });
        showToast("Profile created successfully", "success");
        
        // Refresh profiles immediately to show the new profile
        try {
          await refreshProfiles();
          logger.info("Profiles refreshed after creation");
        } catch (refreshError) {
          logger.error("Error refreshing profiles after creation", { error: refreshError });
          showToast("Profile created, but failed to refresh list. Please refresh the page.", "info");
        }
        
        // Set as active profile
        try {
          if (newProfile.id) {
            await setActiveProfile(newProfile.id);
            logger.info("Active profile set after creation", { profileId: newProfile.id });
          }
        } catch (setActiveError) {
          logger.error("Error setting active profile after creation", { error: setActiveError });
          showToast("Profile created, but failed to set as active. Please select it manually.", "info");
        }
        
        resetForm();
      }
    } catch (error) {
      logger.error("Error saving profile", { error });
      showToast("Failed to save profile. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profilesLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading profiles...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4">
        <p className="text-red-600 dark:text-red-400 mb-2">{loadError}</p>
        <button
          onClick={() => refreshProfiles()}
          className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.length === 0 && !isCreating ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No student profiles yet. Create one to get started!
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600"
          >
            Create First Profile
          </button>
        </div>
      ) : (
        <>
          {!isCreating && !editingProfile && (
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {userRole === "student" ? "My Profile" : "Student Profiles"}
              </h3>
              {userRole !== "student" && (
                <button
                  onClick={handleCreate}
                  className="px-3 py-1.5 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600"
                >
                  Add Profile
                </button>
              )}
            </div>
          )}

          {(isCreating || editingProfile) && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {editingProfile ? "Edit Profile" : "Create Profile"}
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Profile name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Grade Level
                </label>
                <select
                  value={formData.grade_level}
                  onChange={(e) => setFormData({ ...formData, grade_level: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="elementary">Elementary</option>
                  <option value="middle">Middle</option>
                  <option value="high">High</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulty Preference
                </label>
                <select
                  value={formData.difficulty_preference}
                  onChange={(e) => setFormData({ ...formData, difficulty_preference: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="elementary">Elementary</option>
                  <option value="middle">Middle</option>
                  <option value="high">High</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingProfile ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!isCreating && !editingProfile && profiles.length > 0 && (
            <div className="space-y-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{profile.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {profile.grade_level} • {profile.difficulty_preference}
                    </p>
                    {activeProfile?.id === profile.id && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">Active</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      disabled={isSubmitting}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

