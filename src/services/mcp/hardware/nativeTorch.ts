export type TorchMode = 'on' | 'off' | 'strobe';

export class NativeTorchService {
  private static strobeTimer: any = null;
  private static autoOffTimer: any = null;
  private static isCurrentlyOn: boolean = false;

  private static getTorchModule(): any {
    try {
      const Torch = require('react-native-torch').default;
      return Torch;
    } catch {
      return null;
    }
  }

  private static setHardwareTorch(on: boolean): void {
    const Torch = this.getTorchModule();
    if (Torch?.switchState) {
      Torch.switchState(on);
    }
    this.isCurrentlyOn = on;
  }

  static async setTorch(
    mode: TorchMode,
    options?: { strobeIntervalMs?: number; durationSec?: number }
  ): Promise<{ success: boolean; state: string; details: string }> {
    this.clearTimers();

    const Torch = this.getTorchModule();
    const hasHardware = Boolean(Torch?.switchState);

    if (mode === 'off') {
      this.setHardwareTorch(false);
      return {
        success: true,
        state: 'off',
        details: hasHardware ? 'Flashlight turned off' : 'Virtual flashlight turned off (no hardware bridge)'
      };
    }

    if (mode === 'on') {
      this.setHardwareTorch(true);

      if (options?.durationSec && options.durationSec > 0) {
        this.autoOffTimer = setTimeout(() => {
          this.setHardwareTorch(false);
          this.autoOffTimer = null;
        }, options.durationSec * 1000);
      }

      return {
        success: true,
        state: 'on',
        details: hasHardware
          ? `Flashlight switched ON${options?.durationSec ? ` (auto-off in ${options.durationSec}s)` : ''}`
          : 'Virtual flashlight simulated ON'
      };
    }

    if (mode === 'strobe') {
      const interval = Math.max(80, options?.strobeIntervalMs || 150);
      let state = false;

      this.strobeTimer = setInterval(() => {
        state = !state;
        this.setHardwareTorch(state);
      }, interval);

      const duration = options?.durationSec || 5; // Default strobe for 5 seconds
      this.autoOffTimer = setTimeout(() => {
        this.clearTimers();
        this.setHardwareTorch(false);
      }, duration * 1000);

      return {
        success: true,
        state: 'strobe',
        details: `Flashlight strobing at ${interval}ms intervals for ${duration}s`
      };
    }

    return { success: false, state: 'unknown', details: `Unrecognized mode: ${mode}` };
  }

  static clearTimers(): void {
    if (this.strobeTimer) {
      clearInterval(this.strobeTimer);
      this.strobeTimer = null;
    }
    if (this.autoOffTimer) {
      clearTimeout(this.autoOffTimer);
      this.autoOffTimer = null;
    }
  }

  static getStatus(): { isOn: boolean; isStrobing: boolean } {
    return {
      isOn: this.isCurrentlyOn,
      isStrobing: this.strobeTimer !== null
    };
  }
}
