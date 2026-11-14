import { useChatStore } from '../src/store/useChatStore';
import { useCallStore } from '../src/store/useCallStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useMcpLogStore } from '../src/store/useMcpLogStore';

describe('Zustand Stores', () => {
  beforeEach(() => {
    useChatStore.getState().clearChat();
    useCallStore.getState().resetCallState();
    useSettingsStore.getState().resetDefaults();
    useMcpLogStore.getState().clearLogs();
  });

  describe('useChatStore', () => {
    it('adds messages and manages streaming message state', () => {
      const msgId = useChatStore.getState().addMessage({
        role: 'user',
        content: 'Hello Hermes',
      });
      expect(useChatStore.getState().messages.length).toBe(1);
      expect(useChatStore.getState().messages[0].id).toBe(msgId);

      // Start streaming message
      const streamId = useChatStore.getState().startStreamingMessage('assistant', 'Initial');
      expect(useChatStore.getState().isStreaming).toBe(true);

      useChatStore.getState().appendStreamChunk(streamId, ' chunk');
      const streamingMsg = useChatStore.getState().messages.find((m) => m.id === streamId);
      expect(streamingMsg?.content).toBe('Initial chunk');

      useChatStore.getState().finishStreamingMessage(streamId);
      expect(useChatStore.getState().isStreaming).toBe(false);
      expect(useChatStore.getState().streamingMessageId).toBeNull();
    });

    it('updates message tool badge', () => {
      const msgId = useChatStore.getState().addMessage({
        role: 'assistant',
        content: 'Executing action...',
      });

      useChatStore.getState().updateMessageToolBadge(msgId, {
        toolName: 'toggle_flashlight',
        args: { mode: 'on' },
        status: 'success',
        resultSummary: 'Torch on',
      });

      const updated = useChatStore.getState().messages.find((m) => m.id === msgId);
      expect(updated?.toolCall?.status).toBe('success');
      expect(updated?.toolCall?.resultSummary).toBe('Torch on');
    });
  });

  describe('useCallStore', () => {
    it('transitions through incoming ringing, answered active, and ended states', () => {
      expect(useCallStore.getState().state).toBe('idle');

      useCallStore.getState().triggerIncomingCall({
        callId: 'call_1',
        callerName: 'Doctor Office',
        callerNumber: '+1 555-0199',
        ttsScript: 'Urgent medical briefing',
      });

      expect(useCallStore.getState().state).toBe('ringing');
      expect(useCallStore.getState().currentCall?.callerName).toBe('Doctor Office');

      // Answer call
      useCallStore.getState().answerCall();
      expect(useCallStore.getState().state).toBe('active');
      expect(useCallStore.getState().isTtsSpeaking).toBe(true);

      // Toggle controls
      useCallStore.getState().toggleMute();
      expect(useCallStore.getState().isMuted).toBe(true);
      useCallStore.getState().toggleSpeaker();
      expect(useCallStore.getState().isSpeakerOn).toBe(true);

      // End call
      useCallStore.getState().endActiveCall();
      expect(useCallStore.getState().state).toBe('ended');
    });
  });

  describe('useSettingsStore', () => {
    it('updates server settings and permissions', () => {
      useSettingsStore.getState().setServerUrl('ws://192.168.1.50:8765');
      expect(useSettingsStore.getState().serverUrl).toBe('ws://192.168.1.50:8765');

      useSettingsStore.getState().setPermission('allowCamera', false);
      expect(useSettingsStore.getState().permissions.allowCamera).toBe(false);
    });
  });

  describe('useMcpLogStore', () => {
    it('logs tool calls and updates execution results', () => {
      const logId = useMcpLogStore.getState().addLog({
        toolName: 'simulate_call',
        args: { callerName: 'Boss' },
        timestamp: Date.now(),
        status: 'pending',
      });

      expect(useMcpLogStore.getState().logs.length).toBe(1);

      useMcpLogStore.getState().updateLog(logId, {
        status: 'success',
        durationMs: 42,
      });

      const entry = useMcpLogStore.getState().logs[0];
      expect(entry.status).toBe('success');
      expect(entry.durationMs).toBe(42);
    });
  });
});
