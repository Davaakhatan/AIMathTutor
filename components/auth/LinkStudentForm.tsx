"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createRelationship } from "@/services/profileRelationshipService";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

interface SearchResult {
  user_id: string;
  email: string;
  username: string | null;
  student_profile: {
    id: string;
    name: string;
    grade_level: string | null;
    avatar_url: string | null;
  } | null;
}

export default function LinkStudentForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user, refreshProfiles } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchQuery.trim().length < 2) {
      showToast("Please enter at least 2 characters", "error");
      return;
    }

    try {
      setIsSearching(true);
      setResults([]);

      const supabase = await import("@/lib/supabase").then(m => m.getSupabaseClient());
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        showToast("Please sign in to search for students", "error");
        return;
      }

      const response = await fetch("/api/search-students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          searchQuery: searchQuery.trim(),
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search for students");
      }

      setResults(data.results || []);
      
      if (data.results.length === 0) {
        showToast("No students found. Try a different search.", "info");
      }
    } catch (error) {
      logger.error("Error searching for students", { error });
      showToast("Failed to search for students. Please try again.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async (studentProfileId: string, studentName: string) => {
    try {
      setIsLinking(studentProfileId);

      await createRelationship({
        student_profile_id: studentProfileId,
        relationship_type: "parent", // Default, can be changed later
        can_view_progress: true,
        can_manage_profile: false, // Default to view-only
      });

      showToast(`Successfully linked to ${studentName}`, "success");
      setSearchQuery("");
      setResults([]);
      
      // Refresh profiles to show the new linked student
      if (refreshProfiles) {
        await refreshProfiles();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error("Error linking student", { error });
      showToast("Failed to link student. Please try again.", "error");
    } finally {
      setIsLinking(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Link to Student Account
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Search for a student by their email or username to link to their account.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter student email or username"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
            disabled={isSearching}
          />
          <button
            type="submit"
            disabled={isSearching || searchQuery.trim().length < 2}
            className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Search Results:
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.user_id}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {result.student_profile?.avatar_url ? (
                      <img
                        src={result.student_profile.avatar_url}
                        alt={result.student_profile.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-white text-xs font-medium">
                        {result.student_profile?.name.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.student_profile?.name || result.username || result.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {result.email}
                        {result.student_profile?.grade_level && ` • ${result.student_profile.grade_level}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLink(result.student_profile!.id, result.student_profile!.name)}
                    disabled={isLinking === result.student_profile!.id}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    {isLinking === result.student_profile!.id ? "Linking..." : "Link"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

