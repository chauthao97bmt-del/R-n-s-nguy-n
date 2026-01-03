class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmInterval: number | null = null;
  private noteIndex: number = 0;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      this.stopBGM();
      if (this.ctx) this.ctx.suspend();
    } else {
      if (this.ctx) this.ctx.resume();
      this.startBGM(); // Restart BGM if unmuted
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public playNote(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1, slideTo: number | null = null) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      }
      
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }

  public playEat() {
    // High pitched, short "bloop" - sounds cute
    this.playNote(600, 'sine', 0.1, 0.1, 800); 
  }

  public playCrash() {
    // Cartoonish slide down
    this.playNote(400, 'sawtooth', 0.4, 0.3, 50);
  }

  public playWin() {
    // Happy Arpeggio (C Major: C - E - G - C)
    const now = this.getContext().currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        setTimeout(() => this.playNote(freq, 'square', 0.15, 0.1), i * 100);
    });
  }

  // Upbeat, Fun BGM
  public startBGM() {
    if (this.isMuted || this.bgmInterval) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Fun melody sequence (Pentatonic-ish, playful)
    // C4, D4, E4, G4, A4, G4, E4, D4
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66];
    this.noteIndex = 0;

    // Faster tempo (300ms per note)
    this.bgmInterval = window.setInterval(() => {
        if (this.isMuted) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Slightly detach the notes (staccato feel)
        osc.frequency.value = notes[this.noteIndex];
        osc.type = 'triangle'; // Triangle wave is softer but clearer than sine
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05); 
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); // Short decay

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);

        // Sometimes jump an octave for fun variation
        if (Math.random() > 0.8) {
             const osc2 = ctx.createOscillator();
             const gain2 = ctx.createGain();
             osc2.frequency.value = notes[this.noteIndex] * 2;
             osc2.type = 'sine';
             gain2.gain.setValueAtTime(0.02, ctx.currentTime);
             gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
             osc2.connect(gain2);
             gain2.connect(ctx.destination);
             osc2.start();
             osc2.stop(ctx.currentTime + 0.2);
        }

        this.noteIndex = (this.noteIndex + 1) % notes.length;
    }, 300); 
  }

  public stopBGM() {
    if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
    }
  }
}

export const audioService = new AudioService();