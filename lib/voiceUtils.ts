/**
 * Voice utility functions for natural, human-like text-to-speech
 */

/**
 * Get the best available human-like voice
 * Prioritizes natural, high-quality voices
 */
export function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Preferred voice names (human-like, natural voices)
  const preferredVoices = [
    "Google UK English Female",
    "Google UK English Male",
    "Microsoft Zira - English (United States)",
    "Microsoft David - English (United States)",
    "Samantha",
    "Alex",
    "Siri",
    "Karen",
    "Daniel",
    "Moira",
    "Tessa",
    "Fiona",
    "Veena",
    "Victoria",
    "Google US English",
    "English (United States)",
  ];

  // Try to find a preferred voice
  for (const preferredName of preferredVoices) {
    const voice = voices.find((v) =>
      v.name.toLowerCase().includes(preferredName.toLowerCase())
    );
    if (voice) return voice;
  }

  // Fallback: prefer female voices (often more natural for tutoring)
  const femaleVoice = voices.find((v) =>
    v.name.toLowerCase().includes("female") ||
    v.name.toLowerCase().includes("samantha") ||
    v.name.toLowerCase().includes("zira") ||
    v.name.toLowerCase().includes("karen") ||
    v.name.toLowerCase().includes("moira") ||
    v.name.toLowerCase().includes("tessa") ||
    v.name.toLowerCase().includes("fiona")
  );
  if (femaleVoice) return femaleVoice;

  // Fallback: prefer non-robotic voices
  const naturalVoice = voices.find(
    (v) =>
      !v.name.toLowerCase().includes("robotic") &&
      !v.name.toLowerCase().includes("synthetic") &&
      v.lang.startsWith("en")
  );
  if (naturalVoice) return naturalVoice;

  // Last resort: first English voice
  return voices.find((v) => v.lang.startsWith("en")) || voices[0];
}

/**
 * Clean text for better speech synthesis
 * Removes math symbols that don't read well, adds pauses
 */
export function prepareTextForSpeech(text: string): string {
  if (!text) return text;

  return text
    // Replace math symbols with spoken equivalents
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/±/g, " plus or minus ")
    .replace(/≤/g, " less than or equal to ")
    .replace(/≥/g, " greater than or equal to ")
    .replace(/≠/g, " not equal to ")
    .replace(/≈/g, " approximately ")
    .replace(/\^/g, " to the power of ")
    .replace(/\{/g, " ")
    .replace(/\}/g, " ")
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    // Add pauses after punctuation
    .replace(/([.!?])\s+/g, "$1 ")
    .replace(/([,:])\s+/g, "$1 ")
    // Add pause before question words
    .replace(/\b(what|how|why|when|where|which|who)\b/gi, " $1")
    // Remove excessive whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Speak text with natural, human-like voice
 */
export function speakNaturally(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("Speech synthesis not available");
    return;
  }

  const synthesis = window.speechSynthesis;
  synthesis.cancel(); // Cancel any ongoing speech

  // Wait for voices to load if needed
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(prepareTextForSpeech(text));
    const voice = getBestVoice();

    if (voice) {
      utterance.voice = voice;
    }

    // Natural speech settings
    utterance.rate = options?.rate ?? 0.95; // Slightly slower for natural pace
    utterance.pitch = options?.pitch ?? 1.0; // Natural pitch
    utterance.volume = options?.volume ?? 0.9; // Slightly lower for comfort
    utterance.lang = voice?.lang || "en-US";

    // Add slight variation to rate for more natural feel (±0.05)
    const rateVariation = (Math.random() - 0.5) * 0.1;
    utterance.rate = Math.max(0.75, Math.min(1.25, utterance.rate + rateVariation));

    if (options?.onStart) utterance.onstart = options.onStart;
    if (options?.onEnd) utterance.onend = options.onEnd;
    if (options?.onError) utterance.onerror = options.onError;

    synthesis.speak(utterance);
  };

  // Ensure voices are loaded
  if (synthesis.getVoices().length === 0) {
    const onVoicesReady = () => {
      synthesis.onvoiceschanged = null;
      speak();
    };
    synthesis.onvoiceschanged = onVoicesReady;
    // Fallback: speak after short delay if voices don't load
    setTimeout(() => {
      if (synthesis.getVoices().length === 0) {
        speak(); // Use default voice
      }
    }, 100);
  } else {
    speak();
  }
}

