"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to AI Math Tutor! 👋",
    description: "Learn math through guided questions. The tutor never gives direct answers - it helps you discover solutions yourself.",
    position: "center",
  },
  {
    id: "problem-input",
    title: "Start with a Problem",
    description: "Type a math problem or upload an image. You can also use 'Problem of the Day' or generate a random problem.",
    target: "[data-tutorial='problem-input']",
    position: "bottom",
  },
  {
    id: "chat",
    title: "Have a Conversation",
    description: "The tutor will ask guiding questions to help you solve the problem. Type your responses and work through it step by step.",
    target: "[data-tutorial='chat']",
    position: "top",
  },
  {
    id: "hints",
    title: "Get Hints When Stuck",
    description: "Click 'Get Hint' if you need help. The hints get more detailed as you progress through levels.",
    target: "[data-tutorial='hints']",
    position: "top",
  },
  {
    id: "features",
    title: "Explore Features",
    description: "Use the buttons around the screen: Dashboard for stats, Settings to customize, Bookmarks to save problems, and more!",
    target: "[data-tutorial='features']",
    position: "center",
  },
  {
    id: "complete",
    title: "You're All Set! 🎉",
    description: "Start solving problems and track your progress. Earn XP, maintain streaks, and level up as you learn!",
    position: "center",
  },
];

/**
 * Interactive onboarding tutorial for new users
 */
export default function OnboardingTutorial() {
  const [hasCompletedTutorial, setHasCompletedTutorial] = useLocalStorage<boolean>(
    "aitutor-tutorial-completed",
    false
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Show tutorial if not completed
  useEffect(() => {
    if (!hasCompletedTutorial && !isActive) {
      // Delay showing tutorial to let page load
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTutorial, isActive]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setHasCompletedTutorial(true);
    setIsActive(false);
    setCurrentStep(0);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isActive || hasCompletedTutorial) {
    return null;
  }

  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity" />

      {/* Tutorial Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl max-w-md w-full p-6 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        >
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex gap-1">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      index <= currentStep
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="ml-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Skip tutorial"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">
              {step.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors">
              {step.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrevious}
              disabled={isFirst}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95 touch-device:min-h-[44px]"
            >
              Previous
            </button>
            <div className="flex gap-2">
              {!isLast && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors active:scale-95 touch-device:min-h-[44px]"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors active:scale-95 touch-device:min-h-[44px]"
              >
                {isLast ? "Get Started!" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

