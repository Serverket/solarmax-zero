class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private baseVolume: number = 0.8;

  constructor() {}

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = this.baseVolume;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, this.ctx!.currentTime, 0.1);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.baseVolume = vol;
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx!.currentTime, 0.1);
    }
  }

  // Helper to create smooth envelope
  // @ts-ignore
  private createEnvelope(gainNode: GainNode, attack: number, decay: number, sustain: number, release: number, time: number) {
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(1, time + attack);
    gainNode.gain.linearRampToValueAtTime(sustain, time + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, time + attack + decay + release);
  }

  public playSelect() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High tech chirp
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playLaunch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Swoosh sound
    osc.type = 'sawtooth';
    osc2.type = 'square';
    
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);
    
    osc2.frequency.setValueAtTime(150, now);
    osc2.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  public playLaser() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Classic Sci-Fi Pew
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    // Add slight distortion for crunch
    const waveShaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(400);
    for (let i = 0; i < 400; i++) {
       const x = (i * 2) / 400 - 1;
       curve[i] = (3 + 5) * x * 20 * (Math.PI / 180) / (Math.PI + 5 * Math.abs(x));
    }
    waveShaper.curve = curve;
    waveShaper.oversample = '4x';

    osc.connect(waveShaper);
    waveShaper.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    
    // 1. Sub Bass Thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);

    // 2. White noise crunch
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    filter.Q.value = 1;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.4);
  }

  public playCapture() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.8);
    
    const masterChordGain = this.ctx.createGain();
    masterChordGain.gain.setValueAtTime(0, now);
    masterChordGain.gain.linearRampToValueAtTime(0.15, now + 0.4);
    masterChordGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    
    filter.connect(masterChordGain);
    masterChordGain.connect(this.masterGain);

    // Epic synth chord swell
    const notes = [220, 277.18, 329.63, 440]; // A major 7th spacing
    notes.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      
      // Slight detune for fatness
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 15;
      
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  public playVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const arpeggio = [523.25, 659.25, 783.99, 1046.5]; // C E G C

    arpeggio.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square'; // chiptune/pro synth feel
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.6);

      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.2;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.3;
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      // echo routing
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.masterGain!);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.6);
    });
  }

  public playDefeat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const arpeggio = [400, 350, 300, 220, 150];

    arpeggio.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      
      // Pitch bend down
      osc.frequency.setValueAtTime(freq, now + idx * 0.2);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + idx * 0.2 + 0.4);

      gain.gain.setValueAtTime(0, now + idx * 0.2);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.2 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.2);
      osc.stop(now + idx * 0.2 + 0.5);
    });
  }

  public startAmbient() {
    // Ambient humming removed per user request to make room for music tracks.
  }
}

export const sound = new SoundEngine();
