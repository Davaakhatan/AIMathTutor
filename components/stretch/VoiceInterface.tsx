"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { speakNaturally } from "@/lib/voiceUtils";

interface VoiceInterfaceProps {
  onTranscript: (text: string) => void | Promise<void>;
  onSpeak: (text: string) => void;
  isEnabled?: boolean;
}

export default function VoiceInterface({
  onTranscript,
  onSpeak,
  isEnabled = true,
}: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check browser support
    const hasSpeechRecognition =
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
    const hasSpeechSynthesis =
      typeof window !== "undefined" && "speechSynthesis" in window;

    setIsSupported(hasSpeechRecognition && hasSpeechSynthesis);

    if (hasSpeechRecognition) {
      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          console.log("Speech recognition started");
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          console.log("Speech recognized:", transcript);
          onTranscript(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          
          // Handle specific errors
          if (event.error === "not-allowed") {
            alert("Microphone permission denied. Please enable microphone access in your browser settings.");
          } else if (event.error === "no-speech") {
            console.log("No speech detected");
          } else if (event.error === "network") {
            alert("Network error. Please check your internet connection.");
          }
        };

        recognition.onend = () => {
          console.log("Speech recognition ended");
          setIsListening(false);
        };
      } catch (error) {
        console.error("Failed to initialize speech recognition:", error);
        setIsSupported(false);
      }
    }

    if (hasSpeechSynthesis) {
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [onTranscript]);

  const startListening = async () => {
    if (!recognitionRef.current || isListening) return;
    
    // Request microphone permission first
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (permissionError) {
      console.error("Microphone permission denied:", permissionError);
      alert("Microphone access is required for voice input. Please enable it in your browser settings.");
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error: any) {
      console.error("Failed to start speech recognition:", error);
      
      // Handle specific errors
      if (error.message?.includes("already started")) {
        // Recognition already running, stop it first
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            recognitionRef.current?.start();
            setIsListening(true);
          }, 100);
        } catch (retryError) {
          console.error("Failed to restart speech recognition:", retryError);
        }
      } else {
        alert("Failed to start voice input. Please try again or check your microphone settings.");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = useCallback((text: string) => {
    if (isEnabled && text) {
      speakNaturally(text, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  }, [isEnabled]);

  // Expose speak function to parent
  useEffect(() => {
    // Store speak function for parent to call
    (window as any).speakTutorResponse = speak;
  }, [speak]);

  // Check if browser is Firefox (doesn't support SpeechRecognition)
  const isFirefox = typeof window !== "undefined" && 
    navigator.userAgent.toLowerCase().indexOf("firefox") > -1;

  if (!isSupported) {
    // Only show warning in development, and only once
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      const hasRecognition = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
      const hasSynthesis = "speechSynthesis" in window;
      
      // Only log once per session
      if (!(window as any).__voiceWarningShown) {
        console.warn("Voice input not supported:", {
          hasRecognition,
          hasSynthesis,
          browser: isFirefox ? "Firefox" : "Unknown",
          note: isFirefox ? "Firefox doesn't support Web Speech API for speech recognition. Use Chrome/Edge for voice input." : "Speech recognition not available in this browser."
        });
        (window as any).__voiceWarningShown = true;
      }
    }
    
    return null; // Don't show if not supported
  }

  return (
    <div className="flex items-center gap-2">
      {/* Voice Input Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          if (isListening) {
            stopListening();
          } else {
            startListening().catch((err) => {
              console.error("Error starting voice input:", err);
            });
          }
        }}
        disabled={!isEnabled || !isSupported}
        className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${
          isListening
            ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        title={isListening ? "Stop listening" : isSupported ? "Start voice input" : "Voice input not supported in this browser"}
      >
        {isListening ? (
          <svg
            className="w-5 h-5 animate-pulse"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {/* Voice Output Indicator */}
      {isSpeaking && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Speaking...</span>
        </div>
      )}
    </div>
  );
}

// Helper function to speak text with natural voice (exported for use in other components)
export function speakText(text: string) {
  if (!text) return;
  speakNaturally(text);
}

