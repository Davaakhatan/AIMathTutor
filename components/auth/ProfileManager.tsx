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
import LinkStudentForm from "./LinkStudentForm";
import LinkedStudentsList from "./LinkedStudentsList";
import ConnectViaLinkForm from "./ConnectViaLinkForm";
import StudentConnectionLink from "./StudentConnectionLink";
import StudentAccessView from "./StudentAccessView";

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

  // For parents/teachers: Show linking UI instead of profile creation
  if (userRole === "parent" || userRole === "teacher") {
    return (
      <div className="space-y-4 max-h-[700px] overflow-y-auto p-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent mb-2">
            Student Profiles
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Link and manage student accounts
          </p>
        </div>

        {/* Connect via Link Code (easier method) */}
        <ConnectViaLinkForm onSuccess={refreshProfiles} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
              OR
            </span>
          </div>
        </div>

        {/* Search for students (alternative method) */}
        <LinkStudentForm onSuccess={refreshProfiles} />

        <LinkedStudentsList onStudentSelect={refreshProfiles} />
      </div>
    );
  }

  // For students: Show their own profile management
  return (
    <div className="space-y-4 pb-2 max-h-[700px] overflow-y-auto p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
          My Profile
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage your learning profile
        </p>
      </div>
      {/* Show connection link for students */}
      {activeProfile && (
        <>
          <StudentConnectionLink />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Profile Access
              </span>
            </div>
          </div>

          <StudentAccessView />
        </>
      )}

      {profiles.length === 0 && !isCreating ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            No student profiles yet. Create one to get started!
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
          >
            Create First Profile
          </button>
        </div>
      ) : (
        <>
          {!isCreating && !editingProfile && (
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                My Profile
              </h3>
            </div>
          )}

          {(isCreating || editingProfile) && (
            <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                {editingProfile ? "Edit Profile" : "Create Profile"}
              </h3>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                  placeholder="Profile name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Grade Level
                </label>
                <select
                  value={formData.grade_level}
                  onChange={(e) => setFormData({ ...formData, grade_level: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                >
                  <option value="elementary">Elementary</option>
                  <option value="middle">Middle</option>
                  <option value="high">High</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Difficulty Preference
                </label>
                <select
                  value={formData.difficulty_preference}
                  onChange={(e) => setFormData({ ...formData, difficulty_preference: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                >
                  <option value="elementary">Elementary</option>
                  <option value="middle">Middle</option>
                  <option value="high">High</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving..." : editingProfile ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!isCreating && !editingProfile && profiles.length > 0 && (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`relative p-4 rounded-xl transition-all duration-300 overflow-hidden group ${
                    activeProfile?.id === profile.id
                      ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-2 border-blue-300 dark:border-blue-700 shadow-md"
                      : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
                  }`}
                >
                  {/* Active indicator gradient */}
                  {activeProfile?.id === profile.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-indigo-400/5 to-purple-400/5 dark:from-blue-400/10 dark:via-indigo-400/10 dark:to-purple-400/10" />
                  )}
                  
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Enhanced avatar with gradient */}
                        <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg ${
                          activeProfile?.id === profile.id
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700"
                            : "bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800"
                        }`}>
                          {profile.name.charAt(0).toUpperCase()}
                          {activeProfile?.id === profile.id && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {profile.name}
                            </p>
                            {activeProfile?.id === profile.id && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-md text-xs font-semibold border border-green-200 dark:border-green-700">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium border border-blue-200/50 dark:border-blue-700/50">
                              {profile.grade_level}
                            </span>
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium border border-purple-200/50 dark:border-purple-700/50">
                              {profile.difficulty_preference}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Only show Edit button for students (no Delete) */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(profile)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-300 active:scale-95 flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
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

