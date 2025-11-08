"use client";

import { useState, useEffect } from "react";
import AuthModal from "@/components/auth/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setAuthModalOpen(false);
    }
  }, [user]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
      {/* Navigation */}
      <nav className="w-full border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">∑</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                AI Math Tutor
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthModalOpen(true);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setAuthModalOpen(true);
                }}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Content */}
          <div className="mb-16">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
              Master math through
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                guided discovery
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-3xl mx-auto">
              Learn by solving problems with an AI tutor that guides you through questions, not answers. 
              <span className="font-semibold text-gray-800 dark:text-gray-200"> Build understanding, not just memorization.</span>
            </p>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthModalOpen(true);
              }}
              className="group w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-indigo-500/50 active:scale-95 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                Get Started Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-10 py-4 text-gray-700 dark:text-gray-300 text-lg font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300"
            >
              Try as Guest
            </button>
          </div>
        </div>

        {/* Complete Ecosystem Showcase */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Complete Learning Ecosystem
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Three powerful systems working together automatically
            </p>
          </div>

          {/* Ecosystem Showcase */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-3xl p-12 border-2 border-indigo-100 dark:border-indigo-900">

            <div className="grid md:grid-cols-3 gap-8">
              {/* System 1: Tutoring */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Smart Tutoring</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left">
                  <li>• Socratic method guidance</li>
                  <li>• Text, image, or whiteboard input</li>
                  <li>• Adaptive difficulty</li>
                  <li>• Step-by-step explanations</li>
                </ul>
              </div>

              {/* System 2: Growth */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Viral Growth</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left">
                  <li>• Auto-challenges after problems</li>
                  <li>• Share & compete with friends</li>
                  <li>• Referral rewards system</li>
                  <li>• Real-time activity feed</li>
                </ul>
              </div>

              {/* System 3: Companion */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Study Companion</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left">
                  <li>• Remembers past sessions</li>
                  <li>• Tracks learning goals</li>
                  <li>• Smart subject recommendations</li>
                  <li>• Streak rescue alerts</li>
                </ul>
              </div>
            </div>

            {/* Unified Message */}
            <div className="mt-10 text-center">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                All three systems work together automatically - one problem solved triggers everything!
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-32 text-center">
          <div className="inline-block">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Ready to start learning?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl">
              Join students mastering math through guided discovery, automated challenges, and personalized learning paths
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setAuthModalOpen(true);
                }}
                className="px-10 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-indigo-500/50 active:scale-95 transition-all duration-300"
              >
                Create Free Account
              </button>
              <button
                onClick={onGetStarted}
                className="px-10 py-4 text-gray-700 dark:text-gray-300 text-lg font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300"
              >
                Try as Guest
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
