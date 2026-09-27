/**
 * Web Audio API synthesizer with Cyberpunk Synthwave Runner Soundtrack
 * and futuristic sci-fi sound effects.
 * Uses high-precision audio clock scheduling with dynamic tempo and zero external assets.
 */

export interface AudioSettings {
  bgmMuted: boolean;
  sfxMuted: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private isBgmPlaying: boolean = false;
  private bgmMuted: boolean = false;
  private sfxMuted: boolean = false;
  private bgmVolume: number = 0.65;
  private sfxVolume: number = 0.8;

  // Music Sequencer State
  private bpm: number = 132;
  private step: number = 0;
  private nextStepTime: number = 0;
  private schedulerTimer: number | null = null;
  private currentPattern: number = 0;

  // Gameplay pitch tracking
  private comboCount: number = 0;
  private lastCoinTime: number = 0;

  constructor() {
    // Attempt local storage load of audio prefs
    try {
      const savedBgm = localStorage.getItem('craft_bgm_muted');
      if (savedBgm !== null) this.bgmMuted = savedBgm === 'true';
      const savedSfx = localStorage.getItem('craft_sfx_muted');
      if (savedSfx !== null) this.sfxMuted = savedSfx === 'true';
    } catch {
      // ignore
    }
  }

  public initCtx() {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // BGM Gain
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmMuted ? 0 : this.bgmVolume * 0.45, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        // SFX Gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxMuted ? 0 : this.sfxVolume * 0.75, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setBgmMuted(muted: boolean) {
    this.bgmMuted = muted;
    try {
      localStorage.setItem('craft_bgm_muted', muted.toString());
    } catch {}
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(muted ? 0 : this.bgmVolume * 0.45, this.ctx.currentTime, 0.05);
    }
  }

  public setSfxMuted(muted: boolean) {
    this.sfxMuted = muted;
    try {
      localStorage.setItem('craft_sfx_muted', muted.toString());
    } catch {}
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(muted ? 0 : this.sfxVolume * 0.75, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    // If toggleMute is called from legacy buttons, toggle only SFX to preserve background music
    return this.toggleSfx();
  }

  public toggleBgm(): boolean {
    this.initCtx();
    const nextState = !this.bgmMuted;
    this.setBgmMuted(nextState);
    return nextState;
  }

  public toggleSfx(): boolean {
    this.initCtx();
    const nextState = !this.sfxMuted;
    this.setSfxMuted(nextState);
    return nextState;
  }

  public getMuted(): boolean {
    return this.bgmMuted && this.sfxMuted;
  }

  public isBgmMuted(): boolean {
    return this.bgmMuted;
  }

  public isSfxMuted(): boolean {
    return this.sfxMuted;
  }

  public setBgmVolume(val: number) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx && !this.bgmMuted) {
      this.bgmGain.gain.setTargetAtTime(this.bgmVolume * 0.45, this.ctx.currentTime, 0.05);
    }
  }

  public setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx && !this.sfxMuted) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.75, this.ctx.currentTime, 0.05);
    }
  }

  public setSpeedBpmMultiplier(mult: number) {
    // Dynamically increase tempo as player speeds up (132 BPM base up to 164 BPM)
    const targetBpm = Math.min(164, Math.max(128, 132 * (0.85 + mult * 0.15)));
    this.bpm = targetBpm;
  }

  // ----------------------------------------------------
  // CYBERPUNK SYNTHWAVE MULTI-LAYER SEQUENCER
  // ----------------------------------------------------

  public startBGM() {
    this.initCtx();
    if (!this.ctx) return;
    if (this.isBgmPlaying) return;

    this.isBgmPlaying = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    // Scheduler tick every 25ms to look ahead 100ms
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = window.setInterval(() => {
      this.scheduler();
    }, 25);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private scheduler() {
    if (!this.ctx || !this.isBgmPlaying) return;
    const scheduleAheadTime = 0.12;

    while (this.nextStepTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleStep(this.step, this.nextStepTime);
      const stepDuration = 60.0 / (this.bpm * 4); // 16th-note duration
      this.nextStepTime += stepDuration;
      this.step = (this.step + 1) % 64; // 4-bar 16th-note loop
      if (this.step === 0) {
        this.currentPattern = (this.currentPattern + 1) % 2;
      }
    }
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.bgmGain) return;

    // DRUMS: 16th-note grid
    const isQuarter = step % 4 === 0;
    const isOffbeatQuarter = step % 4 === 2;

    // 1. Cyber Kick Drum: Beats 0, 4, 8, 12... (Four-on-the-floor)
    if (isQuarter) {
      this.playSynthKick(time);
    }

    // 2. Punchy Cyber Snare: Beats 4, 12, 20, 28... (Beats 2 & 4 of each bar)
    if (step % 8 === 4) {
      this.playSynthSnare(time);
    }

    // 3. Fast 16th-note Cyber Hi-Hat
    if (step % 2 === 0) {
      const isOpen = isOffbeatQuarter && (step % 8 === 2 || step % 8 === 6);
      this.playSynthHiHat(time, isOpen);
    }

    // 4. Rolling Cyber 16th Bassline (D minor -> F -> C -> Bb progression)
    // Scale: D1 (36.7), F1 (43.6), C1 (32.7), Bb0 (29.14), A0 (27.5)
    const bar = Math.floor(step / 16);
    let rootFreq = 73.42; // D2
    let chordPads = [293.66, 349.23, 440.0]; // D minor triad
    if (bar === 1) {
      rootFreq = 87.31; // F2
      chordPads = [349.23, 440.0, 523.25]; // F major triad
    } else if (bar === 2) {
      rootFreq = 65.41; // C2
      chordPads = [261.63, 329.63, 392.0]; // C major triad
    } else if (bar === 3) {
      rootFreq = 58.27; // Bb1
      chordPads = [233.08, 293.66, 349.23]; // Bb major triad
    }

    // Play lush background pad chord at the start of each bar for seamless flow
    if (step % 16 === 0) {
      this.playAtmosphericPad(time, chordPads);
    }

    // Rolling smooth bass with gentle envelope
    const isOctave = step % 2 === 1;
    const bassFreq = isOctave ? rootFreq * 2 : rootFreq;
    const bassAccent = step % 4 === 0;
    this.playCyberBass(time, bassFreq, bassAccent);

    // 5. Flowing Neon Lead Melodies (Smooth legato synthwave lead)
    const leadPatternsA = [
      587.33, 440.0, 523.25, 392.0,  // D5, A4, C5, G4
      587.33, 659.25, 523.25, 440.0, // D5, E5, C5, A4
      698.46, 587.33, 523.25, 440.0, // F5, D5, C5, A4
      587.33, 523.25, 440.0, 392.0,  // D5, C5, A4, G4
    ];

    const leadPatternsB = [
      440.0, 523.25, 587.33, 659.25, // A4, C5, D5, E5
      698.46, 587.33, 523.25, 440.0, // F5, D5, C5, A4
      392.0, 440.0, 523.25, 587.33,  // G4, A4, C5, D5
      523.25, 440.0, 392.0, 329.63,  // C5, A4, G4, E4
    ];

    const leadPattern = this.currentPattern === 0 ? leadPatternsA : leadPatternsB;
    const leadNote = leadPattern[step % 16];

    // Smooth flowing melody on rhythmic 8th and 16th beats
    if (step % 2 === 0 || (step % 8 === 3 || step % 8 === 7)) {
      this.playNeonLead(time, leadNote, step % 4 === 0);
    }
  }

  private playAtmosphericPad(time: number, frequencies: number[]) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 60.0 / this.bpm * 4.0; // Full 1-bar sustained pad

    frequencies.forEach((freq) => {
      if (!this.ctx || !this.bgmGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.5, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.06, time + 0.3);
      gain.gain.setValueAtTime(0.06, time + dur - 0.3);
      gain.gain.linearRampToValueAtTime(0.001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + dur + 0.05);
    });
  }

  private playSynthKick(time: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);

    gain.gain.setValueAtTime(0.48, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playSynthSnare(time: number) {
    if (!this.ctx || !this.bgmGain) return;

    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
    oscGain.gain.setValueAtTime(0.25, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.12);

    // Noise burst with high-pass filter
    const bufferSize = this.ctx.sampleRate * 0.14;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  private playSynthHiHat(time: number, isOpen: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = isOpen ? 0.12 : 0.04;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7500, time);
    filter.Q.setValueAtTime(3.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isOpen ? 0.14 : 0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private playCyberBass(time: number, freq: number, accent: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Filter sweep for pumping synthwave bass
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4.0, time);
    const filterStart = accent ? 1800 : 950;
    filter.frequency.setValueAtTime(filterStart, time);
    filter.frequency.exponentialRampToValueAtTime(220, time + 0.12);

    const vol = accent ? 0.35 : 0.26;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.14);
  }

  private playNeonLead(time: number, freq: number, accent: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Dual detuned square/sawtooth for lush neon synth feel
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.006, time); // Subtle cyber chorusing detune

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.18);

    const vol = accent ? 0.16 : 0.11;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.22);
    osc2.stop(time + 0.22);
  }

  // ----------------------------------------------------
  // FUTURISTIC SCI-FI SOUND EFFECTS
  // ----------------------------------------------------

  public playJump() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Sci-fi Neon Thruster Leap
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.16);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playSlide() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Plasma Skid / Cyber Jet Duck
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playCoin() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const timeSinceLast = Date.now() - this.lastCoinTime;
    if (timeSinceLast < 700) {
      this.comboCount = Math.min(this.comboCount + 1, 10);
    } else {
      this.comboCount = 0;
    }
    this.lastCoinTime = Date.now();

    const baseFreq = 920;
    const freqMult = Math.pow(1.11, this.comboCount);
    const primaryFreq = baseFreq * freqMult;

    // Cyber crystalline chime with twin oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(primaryFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(primaryFreq * 1.5, now + 0.06);

    osc2.frequency.setValueAtTime(primaryFreq * 2, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.22);
    osc2.stop(now + 0.14);
  }

  public playHit() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playMinecraftOof() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(210, now);
    osc1.frequency.exponentialRampToValueAtTime(70, now + 0.24);

    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(75, now + 0.24);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.24);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  public playGhostWail() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Cyber Hologram glitch wail
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.linearRampToValueAtTime(920, now + 0.18);
    osc.frequency.linearRampToValueAtTime(360, now + 0.4);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playPowerUp() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Cyber Overdrive Arpeggio
    const notes = [329.63, 440.0, 554.37, 659.25, 880.0];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.05;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  public playPoliceSiren() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Cyber Enforcer Alarm
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.linearRampToValueAtTime(1050, now + 0.12);
    osc.frequency.linearRampToValueAtTime(700, now + 0.24);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playDogBark() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Cyber Hound Electronic Bark
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playDiamondPickup() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [1174.66, 1479.98, 1760.0, 2349.32]; // D6, F#6, A6, D7 Quantum Crystal
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.16, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.3);
    });
  }

  public playPickaxeMine() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.06);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playOreBurst() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.16);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);

    setTimeout(() => {
      this.playDiamondPickup();
    }, 120);
  }

  public playTrolleyRumble() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Hover drone / Maglev swoosh
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(210, now + 0.22);
    osc.frequency.linearRampToValueAtTime(80, now + 0.44);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.48);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playNearMiss() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(1350, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playMilestone() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 fanfare
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.07;
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }
  public playIntroBurst() {
    if (this.sfxMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Sub-bass impact boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.8);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.9);

    // Crystalline magic chord
    const chord = [329.63, 440.0, 659.25, 880.0];
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.15, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.95);
    });
  }
}

export const sound = new SoundEngine();
