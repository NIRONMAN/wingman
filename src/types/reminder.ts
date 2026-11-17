export type ReminderType = 'alarm' | 'timer' | 'reminder';
export type ReminderStatus = 'pending' | 'triggered' | 'cancelled';

export interface ReminderItem {
  id: string;
  type: ReminderType;
  title: string;
  notes?: string;
  scheduledTime: number; // epoch timestamp ms
  durationSeconds?: number;
  status: ReminderStatus;
  createdAt: number;
  target?: 'native_alarm' | 'calendar' | 'app_notification' | 'both';
  hour?: number;
  minutes?: number;
}

export interface ReminderStoreState {
  reminders: ReminderItem[];
  addReminder: (
    item: Omit<ReminderItem, 'id' | 'createdAt' | 'status'> & { id?: string; status?: ReminderStatus }
  ) => ReminderItem;
  triggerReminder: (id: string) => void;
  cancelReminder: (id: string) => boolean;
  clearCompleted: () => void;
  getActiveReminders: () => ReminderItem[];
}
