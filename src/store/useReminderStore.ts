import { create } from 'zustand';
import { ReminderItem, ReminderStoreState, ReminderStatus } from '../types/reminder';

export const useReminderStore = create<ReminderStoreState>((set, get) => ({
  reminders: [],

  addReminder: (item) => {
    const newItem: ReminderItem = {
      ...item,
      id: item.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: item.status || 'pending',
      createdAt: Date.now(),
    };

    set((state) => ({
      reminders: [newItem, ...state.reminders],
    }));

    return newItem;
  },

  triggerReminder: (id: string) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, status: 'triggered' as ReminderStatus } : r
      ),
    }));
  },

  cancelReminder: (id: string) => {
    let found = false;
    set((state) => ({
      reminders: state.reminders.map((r) => {
        if (r.id === id && r.status === 'pending') {
          found = true;
          return { ...r, status: 'cancelled' as ReminderStatus };
        }
        return r;
      }),
    }));
    return found;
  },

  clearCompleted: () => {
    set((state) => ({
      reminders: state.reminders.filter((r) => r.status === 'pending'),
    }));
  },

  getActiveReminders: () => {
    return get().reminders.filter((r) => r.status === 'pending');
  },
}));
