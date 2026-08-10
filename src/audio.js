export class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
  }

  start() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.context.destination);
  }

  tone(frequency, duration, type = 'sine', volume = 0.22, slide = 0) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  shoot() {
    this.tone(210, 0.075, 'square', 0.18, -110);
    setTimeout(() => this.tone(560, 0.045, 'triangle', 0.09, -260), 18);
  }

  botShoot(distance = 10) {
    const volume = Math.max(0.025, 0.12 - distance * 0.0035);
    this.tone(160, 0.055, 'square', volume, -70);
  }

  hit(headshot = false) {
    this.tone(headshot ? 880 : 650, 0.06, 'triangle', 0.12, headshot ? 220 : 80);
  }

  tagged() {
    this.tone(520, 0.09, 'triangle', 0.14, 260);
    setTimeout(() => this.tone(780, 0.14, 'triangle', 0.12, 380), 75);
  }

  hurt() {
    this.tone(92, 0.12, 'sawtooth', 0.1, -25);
  }

  reload() {
    this.tone(300, 0.04, 'square', 0.07, 40);
    setTimeout(() => this.tone(410, 0.055, 'square', 0.07, 70), 190);
  }

  countdown() {
    this.tone(440, 0.08, 'triangle', 0.08, 80);
  }

  go() {
    this.tone(560, 0.09, 'triangle', 0.12, 500);
  }
}
