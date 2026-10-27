// Web Audio API synthesized 8-Bit Arcade Chiptune Sound Effects

class SoundController {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        // Safe catch for Safari autoplay policies
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // 8-Bit Arcade Blip / Roulette Tick (Safari-proof)
  playTick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime || 0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.02);

      gain.gain.setValueAtTime(0.12, now);
      // Use linear ramp to prevent Safari exponential ramp DOMExceptions
      gain.gain.linearRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  // 8-Bit Powerup / Mystery Chest Reveal Sound (Safari-proof)
  playReveal() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime || 0;
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          const startTime = now + idx * 0.045;
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.linearRampToValueAtTime(0.001, startTime + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.09);
        } catch {}
      });
    } catch {}
  }

  // 8-Bit Victory Arcade Fanfare (Safari-proof)
  playFanfare() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime || 0;
      const melody = [
        { f: 523.25, d: 0.1 },  // C5
        { f: 523.25, d: 0.1 },  // C5
        { f: 523.25, d: 0.1 },  // C5
        { f: 659.25, d: 0.3 },  // E5
        { f: 587.33, d: 0.15 }, // D5
        { f: 659.25, d: 0.15 }, // E5
        { f: 783.99, d: 0.4 },  // G5
        { f: 1046.5, d: 0.6 },  // C6
      ];
      let offset = 0;
      melody.forEach((item) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          const startTime = now + offset;
          osc.frequency.setValueAtTime(item.f, startTime);

          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.linearRampToValueAtTime(0.001, startTime + item.d);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + item.d + 0.02);
          offset += item.d;
        } catch {}
      });
    } catch {}
  }
}

export const sounds = new SoundController();
