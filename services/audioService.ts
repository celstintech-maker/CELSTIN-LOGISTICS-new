
export const SOUNDS = {
  LOGIN: 'https://assets.mixkit.co/active_storage/sfx/2517/2517-preview.mp3', // Chime
  NEW_ORDER: 'https://assets.mixkit.co/active_storage/sfx/1361/1361-preview.mp3', // Alert
  STATUS_CHANGE: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Pop
  PAYMENT_CONFIRMED: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Success
};

class AudioService {
  private enabled: boolean = false;

  enable() {
    this.enabled = true;
    // Play a silent sound to unlock audio on some browsers
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    audio.play().catch(() => {});
  }

  play(soundUrl: string) {
    if (!this.enabled) return;
    const audio = new Audio(soundUrl);
    audio.volume = 0.6;
    audio.play().catch(err => console.debug("Audio play blocked:", err));
  }
}

export const audioService = new AudioService();
