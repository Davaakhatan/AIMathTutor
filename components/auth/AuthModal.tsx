"use client";

import { useState, useEffect, Suspense } from "react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === "login" ? "Sign In" : "Sign Up"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === "login" ? (
          <LoginForm
            onSuccess={onClose}
            onSwitchToSignUp={() => setMode("signup")}
          />
        ) : (
          <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
            <SignUpForm
              onSuccess={onClose}
              onSwitchToLogin={() => setMode("login")}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
