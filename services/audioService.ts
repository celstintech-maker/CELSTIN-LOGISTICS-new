
export const SOUND_LIBRARY = {
  MODERN: {
    CHIME: 'https://assets.mixkit.co/active_storage/sfx/2517/2517-preview.mp3',
    ALERT: 'https://assets.mixkit.co/active_storage/sfx/1361/1361-preview.mp3',
    POP: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
    SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  },
  CLASSIC: {
    CHIME: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    ALERT: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    POP: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  },
  RETRO: {
    CHIME: 'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3',
    ALERT: 'https://assets.mixkit.co/active_storage/sfx/1002/1002-preview.mp3',
    POP: 'https://assets.mixkit.co/active_storage/sfx/1001/1001-preview.mp3',
    SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/1000/1000-preview.mp3',
  }
};

class AudioService {
  private enabled: boolean = false;
  private muted: boolean = false;

  enable() {
    this.enabled = true;
    this.muted = false;
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    audio.play().catch(() => {});
  }

  setMuted(mute: boolean) {
    this.muted = mute;
  }

  isMuted() {
    return this.muted;
  }

  isEnabled() {
    return this.enabled;
  }

  play(soundUrl: string) {
    if (!this.enabled || this.muted || !soundUrl) return;
    const audio = new Audio(soundUrl);
    audio.volume = 0.6;
    audio.play().catch(err => console.debug("Audio play blocked:", err));
  }
}

export const audioService = new AudioService();
