// Tiny procedural audio — no asset files. Synthesizes simple retro SFX and a
// gentle looping ambient background track with the Web Audio API. Kept small
// and soft to fit the "간단한 효과음 및 배경음악" request.
/* global Phaser */

export default class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.musicEvent = null;
    this.step = 0;

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
    } catch {
      this.enabled = false;
    }

    // Unlock on first interaction (browsers suspend audio until a gesture).
    const resume = () => this.ctx && this.ctx.state === "suspended" && this.ctx.resume();
    scene.input.on("pointerdown", resume);
    scene.input.keyboard?.on("keydown", resume);
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  // One quick oscillator note with an envelope.
  blip({ freq = 440, type = "square", dur = 0.12, vol = 0.3, slide = 0, when = 0 }) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur = 0.18, vol = 0.25, freq = 1200 }) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(lp);
    lp.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  // Named SFX presets, wired from gameplay events.
  play(name) {
    if (!this.enabled) return;
    switch (name) {
      case "attack":
        this.blip({ freq: 720, type: "square", dur: 0.1, vol: 0.18, slide: 520 });
        break;
      case "hit":
        this.noise({ dur: 0.14, vol: 0.22, freq: 2400 });
        this.blip({ freq: 300, type: "sawtooth", dur: 0.08, vol: 0.16, slide: -120 });
        break;
      case "hurt":
        this.blip({ freq: 220, type: "sawtooth", dur: 0.22, vol: 0.28, slide: -120 });
        break;
      case "collect":
        this.blip({ freq: 660, type: "triangle", dur: 0.09, vol: 0.22 });
        this.blip({ freq: 990, type: "triangle", dur: 0.12, vol: 0.22, when: 0.08 });
        break;
      case "dash":
        this.noise({ dur: 0.22, vol: 0.2, freq: 900 });
        this.blip({ freq: 480, type: "sawtooth", dur: 0.18, vol: 0.16, slide: 360 });
        break;
      case "burst":
        this.blip({ freq: 520, type: "sine", dur: 0.4, vol: 0.3, slide: 700 });
        this.blip({ freq: 780, type: "triangle", dur: 0.5, vol: 0.2, slide: 500, when: 0.05 });
        break;
      case "zone":
        this.blip({ freq: 330, type: "sine", dur: 0.5, vol: 0.22 });
        this.blip({ freq: 440, type: "sine", dur: 0.6, vol: 0.18, when: 0.12 });
        break;
      default:
        break;
    }
  }

  // Gentle ambient loop: a slow minor-pentatonic arpeggio over a soft drone.
  startMusic() {
    if (!this.enabled || this.musicEvent) return;
    const scale = [196.0, 233.08, 261.63, 311.13, 349.23, 392.0]; // G minor-ish pentatonic
    this.musicEvent = this.scene.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (!this.ctx || this.ctx.state !== "running") return;
        const t = this.ctx.currentTime;
        // soft arpeggio note
        const f = scale[this.step % scale.length];
        this.softNote(f, 1.6, 0.12, t);
        // occasional higher shimmer
        if (this.step % 4 === 2) this.softNote(f * 2, 1.2, 0.06, t + 0.2);
        // low drone every 8 steps
        if (this.step % 8 === 0) this.softNote(98, 3.4, 0.1, t);
        this.step++;
      },
    });
  }

  softNote(freq, dur, vol, t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.value = freq;
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    lp.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  stopMusic() {
    if (this.musicEvent) {
      this.musicEvent.remove();
      this.musicEvent = null;
    }
  }
}
