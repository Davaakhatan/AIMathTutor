"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SignUpForm from "@/components/auth/SignUpForm";
import LoginForm from "@/components/auth/LoginForm";
import { AuthProvider } from "@/contexts/AuthContext";

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referralCode = searchParams?.get("ref") || null;
  const [mode, setMode] = useState<"login" | "signup">("signup");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] p-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              {mode === "login" ? "Welcome Back" : "Get Started"}
            </h2>
            <button
              onClick={() => router.push("/")}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {referralCode && mode === "signup" && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200 text-center">
                🎉 You&apos;ve been referred! You&apos;ll earn 100 XP when you sign up.
              </p>
            </div>
          )}

          {mode === "login" ? (
            <LoginForm
              onSuccess={() => router.push("/")}
              onSwitchToSignUp={() => setMode("signup")}
            />
          ) : (
            <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
              <SignUpForm
                onSuccess={() => router.push("/")}
                onSwitchToLogin={() => setMode("login")}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }>
        <SignUpPageContent />
      </Suspense>
    </AuthProvider>
  );
}

