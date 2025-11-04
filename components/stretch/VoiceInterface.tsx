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
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          onTranscript(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    if (hasSpeechSynthesis) {
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [onTranscript]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
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
    if (onSpeak) {
      // Store speak function for parent to call
      (window as any).speakTutorResponse = speak;
    }
  }, [onSpeak, speak]);

  if (!isSupported) {
    return null; // Don't show if not supported
  }

  return (
    <div className="flex items-center gap-2">
      {/* Voice Input Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={!isEnabled}
        className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${
          isListening
            ? "bg-red-100 text-red-600 hover:bg-red-200"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        title={isListening ? "Stop listening" : "Start voice input"}
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

