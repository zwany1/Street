export class AudioManager {
  constructor() {
    this.sounds = {};
    this.audioContext = null;
    this.masterGain = null;
    this.enabled = false;
  }

  init() {
    if (this.enabled) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.5;
      this.enabled = true;
      console.log('[AudioManager] Initialized');
    } catch (e) {
      console.warn('[AudioManager] Failed to initialize:', e);
    }
  }

  async loadSound(url, name) {
    if (!this.enabled) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds[name] = audioBuffer;
      console.log(`[AudioManager] Loaded: ${name}`);
    } catch (e) {
      console.warn(`[AudioManager] Failed to load ${name}:`, e);
    }
  }

  play(name, options = {}) {
    if (!this.enabled || !this.sounds[name]) return null;

    const source = this.audioContext.createBufferSource();
    source.buffer = this.sounds[name];

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options.volume || 1.0;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.loop = options.loop || false;
    source.start(0);

    return { source, gainNode };
  }

  setMasterVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  stop(sound) {
    if (sound && sound.source) {
      sound.source.stop();
    }
  }
}
