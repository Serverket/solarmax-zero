class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private baseVolume: number = 0.8;
  private isResuming: boolean = false;

  // Resource Caches (Pre-allocated once to eliminate heap churn and GC spikes)
  private noiseBuffer: AudioBuffer | null = null;
  private distortionCurve: Float32Array | null = null;

  // Rate Limiting & Concurrency Control
  private lastPlayTimes: Record<string, number> = {};
  private activeVoices: number = 0;
  private readonly MAX_ACTIVE_VOICES = 14;

  constructor() {
    // Lazy initialization on first user interaction
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.initCtx();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx({ latencyHint: 'interactive' });
          this.masterGain = this.ctx.createGain();
          this.masterGain.connect(this.ctx.destination);
          this.masterGain.gain.setValueAtTime(this.baseVolume, this.ctx.currentTime);

          // Precompute reusable distortion curve once (no per-laser allocation)
          const curve = new Float32Array(256);
          for (let i = 0; i < 256; i++) {
            const x = (i * 2) / 256 - 1;
            curve[i] = (8 * x * 20 * (Math.PI / 180)) / (Math.PI + 5 * Math.abs(x));
          }
          this.distortionCurve = curve;

          // Precompute reusable white noise buffer (0.3s) once (eliminates 17,000 Math.random calls per boom)
          const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          this.noiseBuffer = buffer;
        } catch (e) {
          console.warn('[SoundEngine] AudioContext initialization failed:', e);
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended' && !this.isResuming) {
      this.isResuming = true;
      this.ctx.resume()
        .catch(() => {})
        .finally(() => {
          this.isResuming = false;
        });
    }
  }

  // Throttler to prevent audio thread starvation during heavy fleet clashes
  private canPlay(key: string, minIntervalMs: number): boolean {
    const now = performance.now();
    const last = this.lastPlayTimes[key] || 0;
    if (now - last < minIntervalMs) {
      return false;
    }
    this.lastPlayTimes[key] = now;
    return true;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.baseVolume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.baseVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.baseVolume, this.ctx.currentTime, 0.05);
    }
  }

  public playSelect() {
    if (this.isMuted || !this.canPlay('select', 45)) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.activeVoices >= this.MAX_ACTIVE_VOICES) return;

    this.activeVoices++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      osc.disconnect();
      gain.disconnect();
    };

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playLaunch() {
    if (this.isMuted || !this.canPlay('launch', 60)) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.activeVoices >= this.MAX_ACTIVE_VOICES) return;

    this.activeVoices++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.18);
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playLaser() {
    // Throttle lasers to max ~25 per second to prevent audio queue explosion in 200-ship dogfights
    if (this.isMuted || !this.canPlay('laser', 38)) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.activeVoices >= this.MAX_ACTIVE_VOICES) return;

    this.activeVoices++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Crisp Sci-Fi Pew
    osc.type = 'square';
    osc.frequency.setValueAtTime(1100 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.10);

    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    // Reuse precomputed distortion curve without expensive 4x oversampling
    if (this.distortionCurve) {
      const waveShaper = this.ctx.createWaveShaper();
      waveShaper.curve = this.distortionCurve as Float32Array<ArrayBuffer>;
      waveShaper.oversample = 'none';

      osc.connect(waveShaper);
      waveShaper.connect(gain);
      gain.connect(this.masterGain);

      osc.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
        osc.disconnect();
        waveShaper.disconnect();
        gain.disconnect();
      };
    } else {
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
        osc.disconnect();
        gain.disconnect();
      };
    }

    osc.start(now);
    osc.stop(now + 0.10);
  }

  public playExplosion() {
    if (this.isMuted || !this.canPlay('explosion', 45)) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.activeVoices >= this.MAX_ACTIVE_VOICES) return;

    this.activeVoices++;
    const now = this.ctx.currentTime;

    // 1. Sub Bass Thump (Clean single oscillator)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.25);
    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      osc.disconnect();
      oscGain.disconnect();
    };

    osc.start(now);
    osc.stop(now + 0.35);

    // 2. White Noise Crunch (Instant playback of pre-rendered noise buffer)
    if (this.noiseBuffer) {
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.25);
      filter.Q.value = 1.2;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      whiteNoise.onended = () => {
        whiteNoise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      };

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.28);
    }
  }

  public playCapture() {
    if (this.isMuted || !this.canPlay('capture', 250)) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.activeVoices >= this.MAX_ACTIVE_VOICES) return;

    this.activeVoices++;
    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(2500, now + 0.6);

    const masterChordGain = this.ctx.createGain();
    masterChordGain.gain.setValueAtTime(0, now);
    masterChordGain.gain.linearRampToValueAtTime(0.14, now + 0.3);
    masterChordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    filter.connect(masterChordGain);
    masterChordGain.connect(this.masterGain);

    // Optimized 3-note harmonic swell (A3, C#4, E4)
    const notes = [220, 277.18, 329.63];
    let remaining = notes.length;

    notes.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.connect(filter);

      osc.onended = () => {
        osc.disconnect();
        remaining--;
        if (remaining <= 0) {
          this.activeVoices = Math.max(0, this.activeVoices - 1);
          filter.disconnect();
          masterChordGain.disconnect();
        }
      };

      osc.start(now);
      osc.stop(now + 0.9);
    });
  }

  public playVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const arpeggio = [523.25, 659.25, 783.99, 1046.5]; // C E G C

    arpeggio.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  }

  public playDefeat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const arpeggio = [400, 330, 260, 180];

    arpeggio.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + idx * 0.18 + 0.35);

      gain.gain.setValueAtTime(0, now + idx * 0.18);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.18 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };

      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.45);
    });
  }

  public startAmbient() {
    // Ambient humming removed per user request to make room for music tracks.
  }
}

export const sound = new SoundEngine();
