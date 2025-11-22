/**
 * Backend Types - Shared types for backend services
 * These types match the database schema exactly
 */

export interface XPData {
  id?: string;
  user_id: string;
  student_profile_id: string | null;
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  xp_history: XPHistoryEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface XPHistoryEntry {
  date: string;
  xp: number;
  reason: string;
  timestamp?: number;
}

export interface StreakData {
  id?: string;
  user_id: string;
  student_profile_id: string | null;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProblemData {
  id?: string;
  user_id: string;
  student_profile_id: string | null;
  text: string;
  type: string;
  difficulty?: string;
  image_url?: string;
  parsed_data?: any;
  is_bookmarked?: boolean;
  is_generated?: boolean;
  source?: string;
  solved_at?: string | null;
  created_at?: string;
  attempts?: number;
  hints_used?: number;
  time_spent?: number;
}

export interface Profile {
  id: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  full_name?: string;
  current_student_profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface XPUpdatePayload {
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  xp_history: XPHistoryEntry[];
}

export interface StreakUpdatePayload {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
}
