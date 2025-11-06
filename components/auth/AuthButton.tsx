"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";
import UserMenu from "./UserMenu";

interface AuthButtonProps {
  isGuestMode?: boolean;
  onSignUpClick?: () => void;
}

export default function AuthButton({ isGuestMode = false, onSignUpClick }: AuthButtonProps) {
  const { user, loading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("login");

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  if (user) {
    return <UserMenu />;
  }

  // Guest mode: show guest badge and sign up CTA
  if (isGuestMode) {
    return (
      <>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
            Guest Mode
          </span>
          <button
            onClick={() => {
              if (onSignUpClick) {
                onSignUpClick();
              } else {
                setModalMode("signup");
                setIsModalOpen(true);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            Sign Up to Save Progress
          </button>
        </div>
        <AuthModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialMode={modalMode}
        />
      </>
    );
  }

  // Not guest mode: show normal sign in/up buttons
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setModalMode("login");
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={() => {
            setModalMode("signup");
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Sign Up
        </button>
      </div>
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialMode={modalMode}
      />
    </>
  );
}

