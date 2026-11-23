import { NativeModules, Platform } from 'react-native';

export type TorchMode = 'on' | 'off' | 'strobe';

const { WingmanTorch } = NativeModules;

export class NativeTorchService {
  private static strobeTimer: any = null;
  private static autoOffTimer: any = null;
  private static isCurrentlyOn: boolean = false;

  private static getFallbackTorch(): any {
    try {
      const Torch = require('react-native-torch').default;
      return Torch;
    } catch {
      return null;
    }
  }

  static async setTorch(
    mode: TorchMode,
    options?: { strobeIntervalMs?: number; durationSec?: number }
  ): Promise<{ success: boolean; state: string; details: string }> {
    this.clearTimers();

    // 1. Prefer our native WingmanTorch module
    if (Platform.OS === 'android' && WingmanTorch) {
      try {
        if (mode === 'off') {
          await WingmanTorch.setTorch(false);
          this.isCurrentlyOn = false;
          return {
            success: true,
            state: 'off',
            details: 'Flashlight turned off (native)'
          };
        }

        if (mode === 'on') {
          await WingmanTorch.setTorch(true);
          this.isCurrentlyOn = true;

          if (options?.durationSec && options.durationSec > 0) {
            this.autoOffTimer = setTimeout(async () => {
              try {
                await WingmanTorch.setTorch(false);
              } catch {}
              this.isCurrentlyOn = false;
              this.autoOffTimer = null;
            }, options.durationSec * 1000);
          }

          return {
            success: true,
            state: 'on',
            details: `Flashlight switched ON (native)${options?.durationSec ? ` (auto-off in ${options.durationSec}s)` : ''}`
          };
        }

        if (mode === 'strobe') {
          const interval = Math.max(60, options?.strobeIntervalMs || 120);
          const duration = options?.durationSec || 4;
          await WingmanTorch.strobe(interval, duration);
          this.isCurrentlyOn = true;

          this.autoOffTimer = setTimeout(() => {
            this.isCurrentlyOn = false;
            this.autoOffTimer = null;
          }, duration * 1000);

          return {
            success: true,
            state: 'strobe',
            details: `Flashlight strobing natively at ${interval}ms for ${duration}s`
          };
        }
      } catch (err: any) {
        console.warn('[NativeTorchService] Native WingmanTorch error, falling back:', err?.message || err);
      }
    }

    // 2. Fallback to react-native-torch or simulated
    const fallbackTorch = this.getFallbackTorch();
    const hasHardware = Boolean(fallbackTorch?.switchState);

    if (mode === 'off') {
      if (hasHardware) fallbackTorch.switchState(false);
      this.isCurrentlyOn = false;
      return {
        success: true,
        state: 'off',
        details: hasHardware ? 'Flashlight turned off' : 'Virtual flashlight turned off (simulated)'
      };
    }

    if (mode === 'on') {
      if (hasHardware) fallbackTorch.switchState(true);
      this.isCurrentlyOn = true;

      if (options?.durationSec && options.durationSec > 0) {
        this.autoOffTimer = setTimeout(() => {
          if (hasHardware) fallbackTorch.switchState(false);
          this.isCurrentlyOn = false;
          this.autoOffTimer = null;
        }, options.durationSec * 1000);
      }

      return {
        success: true,
        state: 'on',
        details: hasHardware ? 'Flashlight switched ON' : 'Virtual flashlight simulated ON'
      };
    }

    if (mode === 'strobe') {
      const interval = Math.max(80, options?.strobeIntervalMs || 150);
      let state = false;

      this.strobeTimer = setInterval(() => {
        state = !state;
        if (hasHardware) fallbackTorch.switchState(state);
      }, interval);

      const duration = options?.durationSec || 4;
      this.autoOffTimer = setTimeout(() => {
        this.clearTimers();
        if (hasHardware) fallbackTorch.switchState(false);
        this.isCurrentlyOn = false;
      }, duration * 1000);

      return {
        success: true,
        state: 'strobe',
        details: `Flashlight strobing at ${interval}ms for ${duration}s`
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
