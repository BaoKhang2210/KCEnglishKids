class SoundEffectsEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play pop sound for buttons
  playPop() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio context might need user gesture
    }
  }

  // Positive joyful chime for correct answer
  playCorrect() {
    try {
      const ctx = this.getContext();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = ctx.currentTime + idx * 0.09;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {}
  }

  // Gentle low boing for incorrect answer (not punishing)
  playGentleWrong() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // Star celebration victory fanfare
  playStarFanfare() {
    try {
      const ctx = this.getContext();
      const notes = [
        { f: 523.25, t: 0 },
        { f: 659.25, t: 0.12 },
        { f: 783.99, t: 0.24 },
        { f: 1046.5, t: 0.36 },
        { f: 1318.5, t: 0.52 }
      ];

      notes.forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = f;

        const startTime = ctx.currentTime + t;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch (e) {}
  }

  // High crystal tinkle chime for badges & achievements
  playBadgeChime() {
    try {
      const ctx = this.getContext();
      const freqs = [1046.5, 1318.51, 1567.98, 2093.0]; // C6, E6, G6, C7 crystal sparkle
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (e) {}
  }

  // Aliases for convenience
  playSuccess() {
    this.playCorrect();
  }

  playWrong() {
    this.playGentleWrong();
  }
}

export const sfx = new SoundEffectsEngine();

let currentAudio: HTMLAudioElement | null = null;
let currentSafetyTimer: any = null;

/**
 * Stops any currently playing word audio or speech synthesis immediately
 */
export const stopWordAudio = () => {
  if (currentSafetyTimer) {
    clearTimeout(currentSafetyTimer);
    currentSafetyTimer = null;
  }

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.onplay = null;
    } catch (e) {}
    currentAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
};

/**
 * Pronounce word cleanly: exactly once, no repeating loops, with speech synthesis fallback
 */
export const playWordAudio = (word: string, audioUrl?: string): Promise<void> => {
  return new Promise((resolve) => {
    // 1. Immediately halt any previously playing sounds or speech
    stopWordAudio();

    sfx.playPop();

    let isHandled = false;

    const finalize = () => {
      if (isHandled) return;
      isHandled = true;
      if (currentSafetyTimer) {
        clearTimeout(currentSafetyTimer);
        currentSafetyTimer = null;
      }
      currentAudio = null;
      resolve();
    };

    const triggerSpeechFallback = () => {
      if (isHandled) return;
      stopWordAudio();
      fallbackSpeech(word, finalize);
    };

    // If valid http(s) audioUrl is provided, attempt HTML5 audio
    if (audioUrl && audioUrl.startsWith('http')) {
      try {
        const audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onended = () => {
          finalize();
        };

        audio.onerror = () => {
          triggerSpeechFallback();
        };

        // Safety timeout in case remote audio hangs or network stalls
        currentSafetyTimer = setTimeout(() => {
          if (!isHandled && (!audio.currentTime || audio.paused)) {
            triggerSpeechFallback();
          }
        }, 2500);

        audio.play().catch((err) => {
          console.warn('[Audio] Remote audio play failed, falling back to speech:', err);
          triggerSpeechFallback();
        });
      } catch (err) {
        triggerSpeechFallback();
      }
    } else {
      fallbackSpeech(word, finalize);
    }
  });
};

const fallbackSpeech = (text: string, onEnd: () => void) => {
  let done = false;
  const safeEnd = () => {
    if (done) return;
    done = true;
    onEnd();
  };

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();

      // Delay slightly to prevent Chromium speech synthesis cancel/speak collision
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 0.85; // Natural child-appropriate speed
          utterance.pitch = 1.1; // Gentle, friendly pitch
          utterance.onend = safeEnd;
          utterance.onerror = safeEnd;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          safeEnd();
        }
      }, 50);
    } catch (e) {
      safeEnd();
    }
  } else {
    safeEnd();
  }
};

/**
 * Pronounce word slowly (0.65x speed) with clear syllables for preschoolers
 */
export const playWordAudioSlow = (word: string): Promise<void> => {
  return new Promise((resolve) => {
    stopWordAudio();
    sfx.playPop();

    let done = false;
    const safeEnd = () => {
      if (done) return;
      done = true;
      resolve();
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          try {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.60; // Extra slow for toddler phonics
            utterance.pitch = 1.05;
            utterance.onend = safeEnd;
            utterance.onerror = safeEnd;
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            safeEnd();
          }
        }, 50);
      } catch (e) {
        safeEnd();
      }
    } else {
      safeEnd();
    }
  });
};

