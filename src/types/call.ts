export type CallState = 'idle' | 'ringing' | 'active' | 'ended';

export interface CallConfig {
  callId: string;
  callerName: string;
  callerNumber?: string;
  callerAvatarUrl?: string;
  ttsScript?: string;
  audioUrl?: string;
  vibrate?: boolean;
  ringtoneSound?: string;
  autoDeclineTimeoutSec?: number;
}

export interface ActiveCallState {
  state: CallState;
  currentCall: CallConfig | null;
  activeDurationSec: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isTtsSpeaking: boolean;
  ttsTranscriptSoFar: string;
}
