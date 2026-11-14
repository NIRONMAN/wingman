import { Vibration, Platform } from 'react-native';

export type HapticPattern = 'light' | 'heavy' | 'alert' | 'morse';

const MORSE_CODE_MAP: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
  '9': '----.', '0': '-----', ' ': ' '
};

function textToMorsePattern(text: string): number[] {
  const pattern: number[] = [0]; // Initial wait
  const DOT = 100;
  const DASH = 300;
  const ELEMENT_GAP = 100;
  const LETTER_GAP = 300;
  const WORD_GAP = 700;

  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    if (char === ' ') {
      pattern.push(WORD_GAP);
      continue;
    }
    const morse = MORSE_CODE_MAP[char];
    if (!morse) continue;

    for (let j = 0; j < morse.length; j++) {
      const symbol = morse[j];
      const duration = symbol === '.' ? DOT : DASH;
      pattern.push(duration);
      pattern.push(ELEMENT_GAP);
    }
    pattern.push(LETTER_GAP);
  }
  return pattern;
}

export class NativeHapticsService {
  static async trigger(pattern: HapticPattern, morseMessage?: string): Promise<{ success: boolean; details: string }> {
    try {
      // Try react-native-haptic-feedback if available
      let rnFeedbackModule: any = null;
      try {
        rnFeedbackModule = require('react-native-haptic-feedback').default;
      } catch {
        // Module not natively linked or running in mock/test
      }

      if (pattern === 'light') {
        if (rnFeedbackModule?.trigger) {
          rnFeedbackModule.trigger('impactLight', { enableVibrateFallback: true, ignoreAndroidSystemSettings: true });
        } else {
          Vibration.vibrate(50);
        }
        return { success: true, details: 'Light impact triggered' };
      }

      if (pattern === 'heavy') {
        if (rnFeedbackModule?.trigger) {
          rnFeedbackModule.trigger('impactHeavy', { enableVibrateFallback: true, ignoreAndroidSystemSettings: true });
        } else {
          Vibration.vibrate(250);
        }
        return { success: true, details: 'Heavy impact triggered' };
      }

      if (pattern === 'alert') {
        if (rnFeedbackModule?.trigger) {
          rnFeedbackModule.trigger('notificationWarning', { enableVibrateFallback: true, ignoreAndroidSystemSettings: true });
        }
        // Pattern: vibrate 150ms, pause 100ms, vibrate 250ms
        Vibration.vibrate([0, 150, 100, 250]);
        return { success: true, details: 'Alert vibration pattern triggered' };
      }

      if (pattern === 'morse') {
        const text = morseMessage && morseMessage.trim() ? morseMessage : 'SOS';
        const vibrationPattern = textToMorsePattern(text);
        Vibration.vibrate(vibrationPattern);
        return {
          success: true,
          details: `Morse pattern for "${text}" triggered with ${vibrationPattern.length} segments`
        };
      }

      // Default fallback
      Vibration.vibrate(100);
      return { success: true, details: 'Default haptic feedback completed' };
    } catch (err: any) {
      return { success: false, details: err?.message || 'Haptic execution error' };
    }
  }

  static stop(): void {
    try {
      Vibration.cancel();
    } catch {
      // Ignore
    }
  }
}
