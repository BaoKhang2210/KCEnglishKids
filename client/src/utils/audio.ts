class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private userInteracted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.userInteracted = true;
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('pointerdown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
    }
  }

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended' && this.userInteracted) {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (e) {
      return null;
    }
  }

  // Play pop sound for buttons
  playPop() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
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
      if (!ctx || ctx.state === 'suspended') return;
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
      if (!ctx || ctx.state === 'suspended') return;
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
      if (!ctx || ctx.state === 'suspended') return;
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
      if (!ctx) return;
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

  // Crisp frosty freeze sound for Koko Freeze Dance
  playFreezeSound() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  // Suspenseful mystery roll for Magic Mystery Box
  playMysteryDrumroll() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 240 + i * 25;
        const t = ctx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    } catch (e) {}
  }

  // Bouncy upbeat preschool melody for Koko Dance
  playDanceMelody() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      const notes = [
        { f: 523.25, d: 0.14 }, // C5
        { f: 659.25, d: 0.14 }, // E5
        { f: 783.99, d: 0.14 }, // G5
        { f: 880.0, d: 0.14 },  // A5
        { f: 783.99, d: 0.22 }, // G5
        { f: 659.25, d: 0.14 }, // E5
        { f: 523.25, d: 0.28 }  // C5
      ];
      let curr = ctx.currentTime;
      notes.forEach(({ f, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, curr);
        gain.gain.linearRampToValueAtTime(0.3, curr + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, curr + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(curr);
        osc.stop(curr + d);
        curr += d + 0.02;
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

  // Realistic enthusiastic classroom clapping / applause effect (rich multi-person applause + warm cheer)
  playApplause() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Create a stereo noise buffer for realistic hand-clap bursts
      const clapDuration = 0.085;
      const bufferSize = Math.floor(ctx.sampleRate * clapDuration);
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          // Sharp attack + natural room decay
          const env = Math.pow(1 - i / bufferSize, 2.2);
          data[i] = (Math.random() * 2 - 1) * env;
        }
      }

      // 36 staggered claps across 2.0 seconds simulating multiple children/teacher clapping
      const totalClaps = 36;
      for (let i = 0; i < totalClaps; i++) {
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter around human palm-clap resonant frequencies (900Hz - 2200Hz)
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 950 + (i % 5) * 240 + Math.random() * 250;
        bandpass.Q.value = 1.4;

        // Highpass to keep claps crisp and non-muddy
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 500;

        const gain = ctx.createGain();
        const progress = i / totalClaps;
        // Swell up then gently fade out
        const envelope = progress < 0.15 ? progress / 0.15 : progress > 0.75 ? (1 - progress) / 0.25 : 1;
        const t = ctx.currentTime + i * 0.052 + Math.random() * 0.028;
        const peakGain = (0.28 + Math.random() * 0.18) * Math.max(0.2, envelope);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(peakGain, t + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, t + clapDuration);

        noise.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(ctx.destination);

        noise.start(t);
        noise.stop(t + clapDuration);
      }

      // Add a subtle celebratory chime on top so it feels extra rewarding for kids
      const chimeNotes = [523.25, 659.25, 783.99, 1046.5];
      chimeNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const st = ctx.currentTime + 0.08 + idx * 0.09;
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.16, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + 0.35);
      });
    } catch (e) {}
  }

  // Playable cheerful Goodbye Song with melody + sung-like vocal synthesis
  playGoodbyeSong(): Promise<void> {
    return new Promise((resolve) => {
      try {
        stopWordAudio();
        const ctx = this.getContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        // Play a warm, cheerful musical accompaniment (Goodbye melody ~ 9 seconds)
        if (ctx) {
          const melody = [
            // "Good-bye, good-bye, it's time to go!"
            { f: 523.25, t: 0.0, d: 0.35 },   // C5
            { f: 659.25, t: 0.4, d: 0.35 },   // E5
            { f: 783.99, t: 0.8, d: 0.35 },   // G5
            { f: 659.25, t: 1.2, d: 0.35 },   // E5
            { f: 880.00, t: 1.6, d: 0.35 },   // A5
            { f: 783.99, t: 2.0, d: 0.35 },   // G5
            { f: 659.25, t: 2.4, d: 0.35 },   // E5
            { f: 523.25, t: 2.8, d: 0.60 },   // C5
            // "Good-bye, good-bye, I'll miss you so!"
            { f: 587.33, t: 3.6, d: 0.35 },   // D5
            { f: 659.25, t: 4.0, d: 0.35 },   // E5
            { f: 698.46, t: 4.4, d: 0.35 },   // F5
            { f: 587.33, t: 4.8, d: 0.35 },   // D5
            { f: 783.99, t: 5.2, d: 0.35 },   // G5
            { f: 698.46, t: 5.6, d: 0.35 },   // F5
            { f: 659.25, t: 6.0, d: 0.35 },   // E5
            { f: 587.33, t: 6.4, d: 0.60 },   // D5
            // "See you to-mor-row, have a won-der-ful day!"
            { f: 523.25, t: 7.2, d: 0.30 },   // C5
            { f: 659.25, t: 7.55, d: 0.30 },  // E5
            { f: 783.99, t: 7.9, d: 0.35 },   // G5
            { f: 1046.50, t: 8.3, d: 0.40 },  // C6
            { f: 987.77, t: 8.75, d: 0.30 },  // B5
            { f: 880.00, t: 9.1, d: 0.30 },   // A5
            { f: 783.99, t: 9.45, d: 0.35 },  // G5
            { f: 1046.50, t: 9.85, d: 0.90 }  // C6 grand finish
          ];

          melody.forEach(({ f, t, d }) => {
            const osc = ctx.createOscillator();
            const sub = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = f;

            sub.type = 'sine';
            sub.frequency.value = f / 2;

            const st = ctx.currentTime + t;
            gain.gain.setValueAtTime(0, st);
            gain.gain.linearRampToValueAtTime(0.22, st + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, st + d);

            osc.connect(gain);
            sub.connect(gain);
            gain.connect(ctx.destination);

            osc.start(st);
            sub.start(st);
            osc.stop(st + d);
            sub.stop(st + d);
          });
        }

        // Accompany with friendly vocal singing / recitation via Web Speech API
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          setTimeout(() => {
            try {
              const lyrics = "Goodbye, goodbye, it's time to go! Goodbye, goodbye, I'll miss you so! See you tomorrow, have a wonderful day!";
              const utterance = new SpeechSynthesisUtterance(lyrics);
              utterance.lang = 'en-US';
              utterance.rate = 0.82;
              utterance.pitch = 1.25;
              utterance.onend = () => resolve();
              utterance.onerror = () => resolve();
              window.speechSynthesis.speak(utterance);
            } catch {
              setTimeout(resolve, 10500);
            }
          }, 150);
        } else {
          setTimeout(resolve, 10500);
        }
      } catch {
        resolve();
      }
    });
  }

  // Bright, cheerful fanfare for clear, loud speech ("Nói to rõ ràng")
  playSpeakingBravo() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      const notes = [
        { f: 523.25, t: 0, d: 0.12 },     // C5
        { f: 659.25, t: 0.1, d: 0.12 },    // E5
        { f: 783.99, t: 0.2, d: 0.12 },    // G5
        { f: 1046.5, t: 0.3, d: 0.35 }     // C6
      ];
      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const st = ctx.currentTime + t;
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.38, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + d);
      });
    } catch (e) {}
  }

  // Grand triumph fanfare for excellent pronunciation ("Phát âm xuất sắc")
  playCheerFanfare() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      const notes = [
        { f: 349.23, t: 0, d: 0.1 },      // F4
        { f: 440.00, t: 0.08, d: 0.1 },   // A4
        { f: 523.25, t: 0.16, d: 0.1 },   // C5
        { f: 698.46, t: 0.25, d: 0.14 },  // F5
        { f: 880.00, t: 0.38, d: 0.55 }   // A5 grand sustain
      ];
      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const st = ctx.currentTime + t;
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.3, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + d);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2400;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(st);
        osc.stop(st + d);
      });
    } catch (e) {}
  }

  // ── AUTHENTIC ANIMAL SOUND SYNTHESIZERS ────────────────────────────────────
  playDog() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      [0, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        const st = ctx.currentTime + offset;
        osc.frequency.setValueAtTime(380, st);
        osc.frequency.exponentialRampToValueAtTime(120, st + 0.14);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(650, st);
        filter.Q.value = 1.8;

        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.45, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.16);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(st);
        osc.stop(st + 0.16);
      });
    } catch (e) {}
  }

  playCat() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      const st = ctx.currentTime;
      osc.frequency.setValueAtTime(450, st);
      osc.frequency.linearRampToValueAtTime(820, st + 0.25);
      osc.frequency.exponentialRampToValueAtTime(440, st + 0.65);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, st);

      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.38, st + 0.08);
      gain.gain.setValueAtTime(0.35, st + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(st);
      osc.stop(st + 0.65);
    } catch (e) {}
  }

  playCow() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      const st = ctx.currentTime;
      osc.frequency.setValueAtTime(145, st);
      osc.frequency.setValueAtTime(155, st + 0.3);
      osc.frequency.exponentialRampToValueAtTime(105, st + 0.95);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(360, st);

      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.42, st + 0.15);
      gain.gain.setValueAtTime(0.38, st + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.95);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(st);
      osc.stop(st + 0.95);
    } catch (e) {}
  }

  playDuck() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      [0, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'square';
        const st = ctx.currentTime + offset;
        osc.frequency.setValueAtTime(480, st);
        osc.frequency.exponentialRampToValueAtTime(260, st + 0.13);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, st);
        filter.Q.value = 4.2;

        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.35, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(st);
        osc.stop(st + 0.15);
      });
    } catch (e) {}
  }

  playSheep() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      const st = ctx.currentTime;
      osc.frequency.setValueAtTime(220, st);
      osc.frequency.linearRampToValueAtTime(245, st + 0.3);
      osc.frequency.exponentialRampToValueAtTime(200, st + 0.7);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 6.5;
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain);

      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 2.5;

      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.38, st + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.7);

      lfoGain.connect(gain.gain);
      lfo.start(st);
      lfo.stop(st + 0.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(st);
      osc.stop(st + 0.7);
    } catch (e) {}
  }

  playBird() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      [0, 0.11, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const st = ctx.currentTime + offset;
        osc.frequency.setValueAtTime(2600, st);
        osc.frequency.linearRampToValueAtTime(3600, st + 0.04);
        osc.frequency.exponentialRampToValueAtTime(2700, st + 0.08);

        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.3, st + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(st);
        osc.stop(st + 0.08);
      });
    } catch (e) {}
  }

  playLion() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      const st = ctx.currentTime;
      osc.frequency.setValueAtTime(95, st);
      osc.frequency.exponentialRampToValueAtTime(55, st + 1.1);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, st);
      filter.frequency.linearRampToValueAtTime(250, st + 1.1);

      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.48, st + 0.2);
      gain.gain.setValueAtTime(0.42, st + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 1.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(st);
      osc.stop(st + 1.1);
    } catch (e) {}
  }

  playMonkey() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      [0, 0.12, 0.26, 0.38].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const st = ctx.currentTime + offset;
        const startFreq = idx < 2 ? 620 : 850;
        const endFreq = idx < 2 ? 780 : 600;

        osc.frequency.setValueAtTime(startFreq, st);
        osc.frequency.exponentialRampToValueAtTime(endFreq, st + 0.08);

        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.32, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(st);
        osc.stop(st + 0.09);
      });
    } catch (e) {}
  }

  playFrog() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      [0, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        const st = ctx.currentTime + offset;
        osc.frequency.setValueAtTime(140, st);
        osc.frequency.linearRampToValueAtTime(110, st + 0.14);

        filter.type = 'bandpass';
        filter.frequency.value = 520;
        filter.Q.value = 3.5;

        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.36, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(st);
        osc.stop(st + 0.15);
      });
    } catch (e) {}
  }

  playPig() {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state === 'suspended') return;
      [0, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        const st = ctx.currentTime + offset;
        osc.frequency.setValueAtTime(190, st);
        osc.frequency.exponentialRampToValueAtTime(130, st + 0.12);

        filter.type = 'bandpass';
        filter.frequency.value = 620;
        filter.Q.value = 2.8;

        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.35, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.13);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(st);
        osc.stop(st + 0.13);
      });
    } catch (e) {}
  }

  playAnimal(animalInput: string) {
    const norm = (animalInput || '').toLowerCase().trim();
    if (norm.includes('dog') || norm.includes('chó') || norm.includes('bark') || norm.includes('woof')) {
      return this.playDog();
    }
    if (norm.includes('cat') || norm.includes('mèo') || norm.includes('meow') || norm.includes('purr')) {
      return this.playCat();
    }
    if (norm.includes('cow') || norm.includes('bò') || norm.includes('moo')) {
      return this.playCow();
    }
    if (norm.includes('duck') || norm.includes('vịt') || norm.includes('quack')) {
      return this.playDuck();
    }
    if (norm.includes('sheep') || norm.includes('cừu') || norm.includes('baa') || norm.includes('lamb')) {
      return this.playSheep();
    }
    if (norm.includes('bird') || norm.includes('chim') || norm.includes('tweet') || norm.includes('chirp') || norm.includes('eagle')) {
      return this.playBird();
    }
    if (norm.includes('lion') || norm.includes('sư tử') || norm.includes('roar') || norm.includes('tiger') || norm.includes('hổ')) {
      return this.playLion();
    }
    if (norm.includes('monkey') || norm.includes('khỉ') || norm.includes('ooh')) {
      return this.playMonkey();
    }
    if (norm.includes('frog') || norm.includes('ếch') || norm.includes('ribbit')) {
      return this.playFrog();
    }
    if (norm.includes('pig') || norm.includes('heo') || norm.includes('lợn') || norm.includes('oink')) {
      return this.playPig();
    }
    this.playDog();
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
          if (err?.name === 'AbortError') {
            // Interrupted by user navigating or pausing, safely finalize
            finalize();
            return;
          }
          if (err?.name === 'NotAllowedError') {
            // Browser autoplay blocked before user gesture, safely finalize without fallback loop
            finalize();
            return;
          }
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

/**
 * Play full sentence dialogue: reads Question, pauses, then reads ALL answers sequentially
 */
export const playDialogueAudio = async (
  questionText: string,
  answers?: string | Array<string | { english?: string; text?: string; audioUrl?: string | null }> | null,
  questionAudioUrl?: string | null,
  singleAnswerAudioUrl?: string | null
): Promise<void> => {
  stopWordAudio();
  const q = String(questionText || '').trim();

  // Normalize list of answers
  const ansList: Array<{ text: string; audioUrl?: string | null }> = [];
  if (Array.isArray(answers)) {
    for (const item of answers) {
      if (typeof item === 'string') {
        if (item.trim()) ansList.push({ text: item.trim() });
      } else if (item && typeof item === 'object') {
        const text = String(item.english || item.text || '').trim();
        if (text) ansList.push({ text, audioUrl: item.audioUrl || undefined });
      }
    }
  } else if (typeof answers === 'string') {
    const a = answers.trim();
    if (a && (!q || a.toLowerCase() !== q.toLowerCase())) {
      ansList.push({ text: a, audioUrl: singleAnswerAudioUrl });
    }
  }

  // 1. Play Question if present
  if (q) {
    await playWordAudio(q, questionAudioUrl || undefined);
    if (ansList.length > 0) {
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  // 2. Play all answers sequentially with natural pause
  for (let i = 0; i < ansList.length; i++) {
    const ans = ansList[i];
    await playWordAudio(ans.text, ans.audioUrl || undefined);
    if (i < ansList.length - 1) {
      await new Promise((r) => setTimeout(r, 650));
    }
  }
};


