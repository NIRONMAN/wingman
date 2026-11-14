import { create } from 'zustand';
import { ActiveCallState, CallConfig, CallState } from '../types/call';
import { NativeSoundService } from '../services/mcp/hardware/nativeSound';
import { NativeHapticsService } from '../services/mcp/hardware/nativeHaptics';

interface CallStore extends ActiveCallState {
  triggerIncomingCall: (config: CallConfig) => void;
  answerCall: () => void;
  declineCall: () => void;
  endActiveCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  updateTtsProgress: (transcript: string) => void;
  resetCallState: () => void;
}

let callTimerInterval: any = null;
let stopTtsFn: (() => void) | null = null;
let autoDeclineTimeout: any = null;

export const useCallStore = create<CallStore>((set, get) => ({
  state: 'idle',
  currentCall: null,
  activeDurationSec: 0,
  isMuted: false,
  isSpeakerOn: false,
  isTtsSpeaking: false,
  ttsTranscriptSoFar: '',

  triggerIncomingCall: (config: CallConfig) => {
    // Stop any existing call
    get().resetCallState();

    set({
      state: 'ringing',
      currentCall: config,
      activeDurationSec: 0,
      isMuted: false,
      isSpeakerOn: false,
      isTtsSpeaking: false,
      ttsTranscriptSoFar: '',
    });

    // Start ringtone and vibration
    NativeSoundService.startRingtone();

    // Setup auto-decline timeout if specified
    const timeoutSec = config.autoDeclineTimeoutSec || 30;
    autoDeclineTimeout = setTimeout(() => {
      if (get().state === 'ringing') {
        get().declineCall();
      }
    }, timeoutSec * 1000);
  },

  answerCall: () => {
    if (autoDeclineTimeout) {
      clearTimeout(autoDeclineTimeout);
      autoDeclineTimeout = null;
    }

    // Stop ringtone
    NativeSoundService.stopRingtone();
    NativeHapticsService.trigger('heavy');

    set({
      state: 'active',
      activeDurationSec: 0,
      isTtsSpeaking: true,
      ttsTranscriptSoFar: '',
    });

    // Start call timer
    if (callTimerInterval) clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
      set((prev) => ({ activeDurationSec: prev.activeDurationSec + 1 }));
    }, 1000);

    // Play TTS if script provided
    const call = get().currentCall;
    const script = call?.ttsScript || "Hello, this is Hermes. I'm following up on your request. Everything is in order.";

    stopTtsFn = NativeSoundService.simulateTtsPlayback(
      script,
      (transcript) => {
        set({ ttsTranscriptSoFar: transcript });
      },
      () => {
        set({ isTtsSpeaking: false });
      }
    );
  },

  declineCall: () => {
    if (autoDeclineTimeout) {
      clearTimeout(autoDeclineTimeout);
      autoDeclineTimeout = null;
    }
    NativeSoundService.stopRingtone();
    NativeHapticsService.trigger('light');

    set({ state: 'ended' });
    setTimeout(() => {
      get().resetCallState();
    }, 1200);
  },

  endActiveCall: () => {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }
    if (stopTtsFn) {
      stopTtsFn();
      stopTtsFn = null;
    }
    NativeSoundService.stopRingtone();
    NativeHapticsService.trigger('heavy');

    set({ state: 'ended', isTtsSpeaking: false });
    setTimeout(() => {
      get().resetCallState();
    }, 1200);
  },

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleSpeaker: () => set((state) => ({ isSpeakerOn: !state.isSpeakerOn })),

  updateTtsProgress: (transcript: string) => {
    set({ ttsTranscriptSoFar: transcript });
  },

  resetCallState: () => {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }
    if (stopTtsFn) {
      stopTtsFn();
      stopTtsFn = null;
    }
    if (autoDeclineTimeout) {
      clearTimeout(autoDeclineTimeout);
      autoDeclineTimeout = null;
    }
    NativeSoundService.stopRingtone();

    set({
      state: 'idle',
      currentCall: null,
      activeDurationSec: 0,
      isMuted: false,
      isSpeakerOn: false,
      isTtsSpeaking: false,
      ttsTranscriptSoFar: '',
    });
  },
}));
