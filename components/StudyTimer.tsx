"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface StudySession {
  startTime: number;
  endTime?: number;
  duration: number; // in seconds
  problemsSolved: number;
}

interface StudyTimerProps {
  isActive: boolean;
  onProblemSolved?: () => void;
}

/**
 * Study Session Timer
 * Tracks active study time and session statistics
 */
export default function StudyTimer({ isActive, onProblemSolved }: StudyTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useLocalStorage<StudySession[]>("aitutor-study-sessions", []);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [problemsSolvedThisSession, setProblemsSolvedThisSession] = useState(0);

  // Start timer when active
  useEffect(() => {
    if (isActive && !isRunning) {
      startTimeRef.current = Date.now();
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else if (!isActive && isRunning) {
      // Stop timer and save session
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (startTimeRef.current) {
        const session: StudySession = {
          startTime: startTimeRef.current,
          endTime: Date.now(),
          duration: elapsedTime,
          problemsSolved: problemsSolvedThisSession,
        };
        setSessions((prev) => [session, ...prev].slice(0, 100)); // Keep last 100 sessions
        setElapsedTime(0);
        setProblemsSolvedThisSession(0);
      }
      setIsRunning(false);
      startTimeRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isRunning, elapsedTime, problemsSolvedThisSession, setSessions]);

  // Listen for problem solved events
  useEffect(() => {
    const handleProblemSolved = () => {
      setProblemsSolvedThisSession((prev) => prev + 1);
      if (onProblemSolved) {
        onProblemSolved();
      }
    };

    window.addEventListener("problemSolved", handleProblemSolved);
    return () => window.removeEventListener("problemSolved", handleProblemSolved);
  }, [onProblemSolved]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const totalStudyTime = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalProblemsSolved = sessions.reduce((sum, s) => sum + s.problemsSolved, 0);
  const todaySessions = sessions.filter((s) => {
    const sessionDate = new Date(s.startTime);
    const today = new Date();
    return (
      sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear()
    );
  });
  const todayStudyTime = todaySessions.reduce((sum, s) => sum + s.duration, 0);

  if (!isRunning && elapsedTime === 0) {
    return null; // Don't show when not active
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 hidden sm:block">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all min-h-[44px] touch-device:min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Study timer"
      >
        <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
          {formatTime(elapsedTime)}
        </span>
        {isRunning && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </button>

      {showDetails && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-64 transition-colors">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 transition-colors">Current Session</p>
              <p className="text-2xl font-light text-gray-900 dark:text-gray-100 transition-colors">
                {formatTime(elapsedTime)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">
                {problemsSolvedThisSession} problem{problemsSolvedThisSession !== 1 ? "s" : ""} solved
              </p>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 transition-colors">Today</p>
              <p className="text-xl font-light text-gray-900 dark:text-gray-100 transition-colors">
                {formatTime(todayStudyTime)}
              </p>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 transition-colors">All Time</p>
              <p className="text-lg font-light text-gray-900 dark:text-gray-100 transition-colors">
                {formatTime(totalStudyTime)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">
                {totalProblemsSolved} problems solved across {sessions.length} sessions
              </p>
            </div>
            {isRunning && (
              <p className="text-xs text-green-600 dark:text-green-400 pt-2 border-t border-gray-200 dark:border-gray-700 transition-colors">
                🟢 Active session
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

