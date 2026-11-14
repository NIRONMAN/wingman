import { create } from 'zustand';
import { McpToolExecutionLog, McpToolResult } from '../types/mcp';

interface McpLogStore {
  logs: McpToolExecutionLog[];
  addLog: (log: Omit<McpToolExecutionLog, 'id'>) => string;
  updateLog: (
    id: string,
    updates: Partial<Pick<McpToolExecutionLog, 'status' | 'result' | 'errorMessage' | 'durationMs'>>
  ) => void;
  clearLogs: () => void;
}

export const useMcpLogStore = create<McpLogStore>((set) => ({
  logs: [],

  addLog: (logData) => {
    const id = `mcp_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newLog: McpToolExecutionLog = {
      ...logData,
      id,
    };

    set((state) => ({
      logs: [newLog, ...state.logs.slice(0, 99)], // keep last 100 entries
    }));

    return id;
  },

  updateLog: (id, updates) => {
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, ...updates } : log)),
    }));
  },

  clearLogs: () => set({ logs: [] }),
}));
