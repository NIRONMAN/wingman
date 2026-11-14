import { NativeHapticsService } from './nativeHaptics';

export class NativeSoundService {
  private static ringtoneLoopInterval: any = null;
  private static isPlayingRingtone: boolean = false;
  private static speechInterval: any = null;

  static startRingtone(): void {
    if (this.isPlayingRingtone) return;
    this.isPlayingRingtone = true;

    // Simulate ringtone loop with haptic pulses every 2 seconds
    NativeHapticsService.trigger('heavy');
    this.ringtoneLoopInterval = setInterval(() => {
      NativeHapticsService.trigger('alert');
    }, 2000);

    // Try react-native-sound if assets are bundled
    try {
      const Sound = require('react-native-sound');
      if (Sound) {
        Sound.setCategory('Playback');
      }
    } catch {
      // Audio bridge fallback
    }
  }

  static stopRingtone(): void {
    this.isPlayingRingtone = false;
    if (this.ringtoneLoopInterval) {
      clearInterval(this.ringtoneLoopInterval);
      this.ringtoneLoopInterval = null;
    }
    NativeHapticsService.stop();
  }

  static simulateTtsPlayback(
    script: string,
    onProgress: (chunk: string, percent: number) => void,
    onComplete: () => void
  ): () => void {
    const words = script.split(' ');
    let currentIndex = 0;

    if (this.speechInterval) {
      clearInterval(this.speechInterval);
      this.speechInterval = null;
    }

    // Emit words at a steady cadence (~250 words per minute => ~240ms per word)
    this.speechInterval = setInterval(() => {
      if (currentIndex >= words.length) {
        if (this.speechInterval) {
          clearInterval(this.speechInterval);
          this.speechInterval = null;
        }
        onComplete();
        return;
      }

      const chunk = words.slice(0, currentIndex + 1).join(' ');
      const percent = Math.min(100, Math.round(((currentIndex + 1) / words.length) * 100));
      onProgress(chunk, percent);
      currentIndex++;
    }, 240);

    return () => {
      if (this.speechInterval) {
        clearInterval(this.speechInterval);
        this.speechInterval = null;
      }
    };
  }
}
