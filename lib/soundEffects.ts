/**
 * Sound Effects System
 * Provides audio feedback for user interactions
 */

class SoundManager {
  private audioContext: AudioContext | null = null;
  private soundsEnabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Initialize audio context lazily (only when needed)
    if (typeof window !== "undefined") {
      try {
        // Check if sounds are enabled in settings
        const settings = localStorage.getItem("aitutor-settings");
        if (settings) {
          const parsed = JSON.parse(settings);
          this.soundsEnabled = parsed.soundEffects !== false; // Default to true
          this.volume = parsed.soundVolume ?? 0.5;
        }
      } catch {
        // Ignore errors
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.soundsEnabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Generate a tone using Web Audio API
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = this.volume
  ) {
    if (!this.soundsEnabled || typeof window === "undefined") return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      // Silently fail if audio is not available
      console.debug("Audio playback failed:", error);
    }
  }

  /**
   * Play success sound (solving a problem)
   */
  playSuccess() {
    this.playTone(523.25, 0.1, "sine"); // C5
    setTimeout(() => this.playTone(659.25, 0.1, "sine"), 100); // E5
    setTimeout(() => this.playTone(783.99, 0.2, "sine"), 200); // G5
  }

  /**
   * Play level up sound
   */
  playLevelUp() {
    // Ascending arpeggio
    this.playTone(523.25, 0.15, "sine"); // C5
    setTimeout(() => this.playTone(659.25, 0.15, "sine"), 150); // E5
    setTimeout(() => this.playTone(783.99, 0.15, "sine"), 300); // G5
    setTimeout(() => this.playTone(1046.50, 0.3, "sine"), 450); // C6
  }

  /**
   * Play XP gain sound
   */
  playXPGain() {
    this.playTone(783.99, 0.1, "sine", this.volume * 0.6); // G5, quieter
  }

  /**
   * Play error sound
   */
  playError() {
    this.playTone(200, 0.2, "sawtooth", this.volume * 0.4);
    setTimeout(() => this.playTone(150, 0.3, "sawtooth", this.volume * 0.4), 200);
  }

  /**
   * Play hint sound
   */
  playHint() {
    this.playTone(392, 0.15, "sine", this.volume * 0.5); // G4
  }

  /**
   * Play click sound
   */
  playClick() {
    this.playTone(800, 0.05, "square", this.volume * 0.3);
  }

  /**
   * Play notification sound
   */
  playNotification() {
    this.playTone(659.25, 0.15, "sine", this.volume * 0.6); // E5
  }

  /**
   * Play typing sound (for message input)
   */
  playTyping() {
    this.playTone(600, 0.03, "square", this.volume * 0.2);
  }
}

// Singleton instance
let soundManagerInstance: SoundManager | null = null;

export const getSoundManager = (): SoundManager => {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
  }
  return soundManagerInstance;
};

// Convenience functions
export const playSuccess = () => getSoundManager().playSuccess();
export const playLevelUp = () => getSoundManager().playLevelUp();
export const playXPGain = () => getSoundManager().playXPGain();
export const playError = () => getSoundManager().playError();
export const playHint = () => getSoundManager().playHint();
export const playClick = () => getSoundManager().playClick();
export const playNotification = () => getSoundManager().playNotification();
export const playTyping = () => getSoundManager().playTyping();

export const setSoundEnabled = (enabled: boolean) => getSoundManager().setEnabled(enabled);
export const setSoundVolume = (volume: number) => getSoundManager().setVolume(volume);

