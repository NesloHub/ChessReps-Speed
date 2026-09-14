// Web Audio API Sound Synthesizer for ChessReps Trainer
class ChessAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.6;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playMove() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Crisp wooden tap sound
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.06);

    gain.gain.setValueAtTime(0.4 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  playCapture() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Deeper wooden thud + snap
    const now = this.ctx.currentTime;
    
    // Sub knock
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.09);
    gain1.gain.setValueAtTime(0.6 * this.volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.095);

    // High snap
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(550, now);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.04);
    gain2.gain.setValueAtTime(0.3 * this.volume, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.045);
  }

  playCheck() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Alert ping
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  playCorrect(streak = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Upbeat pleasant harmonic ding, pitch slightly increases with streak
    const now = this.ctx.currentTime;
    const baseFreq = Math.min(523.25 * (1 + (streak % 8) * 0.08), 900); // C5 upwards
    
    [baseFreq, baseFreq * 1.25].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = i * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.25 * this.volume, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.25);
    });
  }

  playError() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Soft low warning buzz (not harsh, but distinctive)
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.18);

    gain.gain.setValueAtTime(0.2 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  playComplete() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // 3-note celebration chime (Major triad: C5, E5, G5)
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.3 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.45);
    });
  }
}

if (typeof window !== 'undefined') {
  window.chessAudio = new ChessAudio();
}
