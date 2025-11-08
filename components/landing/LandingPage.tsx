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

        {/* Features Section */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Everything you need to master math
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="group bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                Socratic Method
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Learn by discovering solutions through guided questions, not memorizing answers
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/20 border-2 border-purple-100 dark:border-purple-900 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                AI-Powered
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Powered by GPT-4 for personalized, adaptive learning that adjusts to your level
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950/20 border-2 border-green-100 dark:border-green-900 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                Track Progress
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Monitor your learning journey with XP, achievements, and detailed analytics
              </p>
            </div>
          </div>

          {/* Additional Features List */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 transition-colors">Problem Input</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-light transition-colors">Text, image, or draw</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 transition-colors">Difficulty Levels</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-light transition-colors">Elementary to Advanced</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 transition-colors">Whiteboard</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-light transition-colors">Visual problem solving</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 transition-colors">Gamification</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-light transition-colors">XP, levels, achievements</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-24 sm:mt-32 text-center">
          <h2 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-gray-100 mb-4 transition-colors">
            Ready to start learning?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-light mb-8 transition-colors">
            Join thousands of students mastering math through guided discovery
          </p>
          <button
            onClick={() => {
              setAuthMode("signup");
              setAuthModalOpen(true);
            }}
            className="px-8 py-3.5 bg-indigo-600 text-white text-base font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors min-h-[48px]"
          >
            Create Free Account
          </button>
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
