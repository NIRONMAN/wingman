import { create } from 'zustand';
import { ChatMessage, MessageRole, ToolCallBadgeInfo } from '../types/chat';
import { ConnectionState } from '../types/hermes';

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  connectionStatus: ConnectionState;

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => string;
  startStreamingMessage: (role: MessageRole, initialContent?: string) => string;
  appendStreamChunk: (id: string, delta: string) => void;
  finishStreamingMessage: (id: string) => void;
  updateMessageToolBadge: (messageId: string, badge: ToolCallBadgeInfo) => void;
  setConnectionStatus: (status: ConnectionState) => void;
  clearChat: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-msg-1',
    role: 'assistant',
    content: "👋 **Wingman MCP Node Active**.\nI'm connected as your physical companion. Hermes can execute device actions (calls, haptics, flashlight, snapshots, telemetry) or chat with you in real time.",
    timestamp: Date.now(),
  },
];

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: INITIAL_MESSAGES,
  isStreaming: false,
  streamingMessageId: null,
  connectionStatus: 'disconnected',

  addMessage: (msgData) => {
    const id = msgData.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ChatMessage = {
      ...msgData,
      id,
      timestamp: msgData.timestamp || Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, newMsg],
    }));

    return id;
  },

  startStreamingMessage: (role: MessageRole, initialContent = '') => {
    const id = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ChatMessage = {
      id,
      role,
      content: initialContent,
      timestamp: Date.now(),
      isStreaming: true,
    };

    set((state) => ({
      messages: [...state.messages, newMsg],
      isStreaming: true,
      streamingMessageId: id,
    }));

    return id;
  },

  appendStreamChunk: (id: string, delta: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta, isStreaming: true } : m
      ),
    }));
  },

  finishStreamingMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      ),
      isStreaming: false,
      streamingMessageId: null,
    }));
  },

  updateMessageToolBadge: (messageId: string, badge: ToolCallBadgeInfo) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, toolCall: badge } : m
      ),
    }));
  },

  setConnectionStatus: (status: ConnectionState) => {
    set({ connectionStatus: status });
  },

  clearChat: () => {
    set({
      messages: [],
      isStreaming: false,
      streamingMessageId: null,
    });
  },
}));
