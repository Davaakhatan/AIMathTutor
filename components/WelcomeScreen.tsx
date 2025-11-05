"use client";

import { useState, useEffect, useCallback } from "react";
import * as React from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

/**
 * Welcome screen for first-time users
 */
export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [isMounted, setIsMounted] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useLocalStorage<boolean>(
    "aitutor-welcome-seen",
    false
  );
  const [isVisible, setIsVisible] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to AI Math Tutor! 🎓",
      description: "Learn math through guided questions. The tutor never gives direct answers - it helps you discover solutions yourself.",
      icon: "👋",
    },
    {
      title: "Socratic Learning Method",
      description: "Answer questions, get hints when stuck, and work through problems step by step.",
      icon: "💡",
    },
    {
      title: "Track Your Progress",
      description: "Earn XP, maintain streaks, unlock achievements, and level up as you learn!",
      icon: "📊",
    },
    {
      title: "Multiple Ways to Learn",
      description: "Type problems, upload images, use voice input, draw on the whiteboard, or try Problem of the Day!",
      icon: "🚀",
    },
  ];

  // Check localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("aitutor-welcome-seen");
        if (stored === "true" || stored === '"true"') {
          setIsVisible(false);
          setHasSeenWelcome(true);
        }
      } catch (error) {
        console.error("Error checking localStorage:", error);
      }
    }
  }, [setHasSeenWelcome]);

  // Sync with hasSeenWelcome from localStorage hook
  useEffect(() => {
    if (hasSeenWelcome) {
      setIsVisible(false);
    }
  }, [hasSeenWelcome]);

  // Auto-advance slides
  useEffect(() => {
    if (currentSlide < slides.length - 1) {
      const timer = setTimeout(() => {
        setCurrentSlide(currentSlide + 1);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, slides.length]);

  // Handle dismiss
  const handleDismiss = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("Dismissing welcome screen");
    
    // Set localStorage FIRST - this is critical
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("aitutor-welcome-seen", "true");
        // Verify it was set
        const verify = window.localStorage.getItem("aitutor-welcome-seen");
        if (verify !== "true") {
          // If it didn't work, try again
          window.localStorage.setItem("aitutor-welcome-seen", "true");
        }
      } catch (error) {
        console.error("localStorage error:", error);
      }
    }
    
    // Update hook state
    setHasSeenWelcome(true);
    
    // Hide component immediately
    setIsVisible(false);
    
    // Show main content
    if (typeof window !== "undefined") {
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.style.visibility = "visible";
      }
      
      // Dispatch event to notify parent
      window.dispatchEvent(new Event("welcomeDismissed"));
    }
    
    // Call callback
    try {
      onGetStarted();
    } catch (error) {
      console.error("onGetStarted error:", error);
    }
  }, [setHasSeenWelcome, onGetStarted]);

  const handleGetStarted = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("Get Started clicked - closing immediately");
    handleDismiss(e);
  }, [handleDismiss]);

  const handleSkip = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Skip clicked - advancing through slides");
    
    // Skip to the last slide first
    setCurrentSlide(slides.length - 1);
    
    // Then dismiss after a brief moment to show the last slide
    setTimeout(() => {
      handleDismiss();
    }, 500); // Brief delay to show the last slide
  }, [handleDismiss, slides.length]);

  // NOW we can check conditions and return early - ALL HOOKS HAVE BEEN CALLED
  // Don't render until mounted
  if (!isMounted) {
    return null;
  }

  // Check if already seen - if so, don't render at all
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("aitutor-welcome-seen");
    if (stored === "true" || stored === '"true"') {
      return null;
    }
  }
  
  // If already seen via hook or not visible, don't render
  if (hasSeenWelcome || !isVisible) {
    return null;
  }

  const slide = slides[currentSlide];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4"
      onClick={(e) => {
        // Allow clicking outside to dismiss (optional)
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full p-8 sm:p-12 text-center transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="text-6xl mb-6 animate-bounce">{slide.icon}</div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 transition-colors">
          {slide.title}
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed transition-colors">
          {slide.description}
        </p>

        {/* Slide Indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-blue-600 dark:bg-blue-500"
                  : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleGetStarted(e);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="px-8 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 transition-all font-medium text-base min-h-[48px] touch-device:min-h-[52px] focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            style={{ pointerEvents: "auto" }}
          >
            Get Started
          </button>
          {currentSlide < slides.length - 1 && (
            <button
              type="button"
              onClick={() => {
                // Go to next slide
                if (currentSlide < slides.length - 1) {
                  setCurrentSlide(currentSlide + 1);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium text-base min-h-[48px] touch-device:min-h-[52px] focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
              style={{ pointerEvents: "auto" }}
            >
              Next
            </button>
          )}
          <button
            type="button"
            onClick={handleSkip}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium text-base min-h-[48px] touch-device:min-h-[52px] focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
            style={{ pointerEvents: "auto" }}
          >
            Skip
          </button>
        </div>

        {/* Progress */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 transition-colors">
          {currentSlide + 1} of {slides.length}
        </p>
      </div>
    </div>
  );
}
