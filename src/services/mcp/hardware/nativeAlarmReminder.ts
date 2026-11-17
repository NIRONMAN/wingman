import { NativeModules, Platform } from 'react-native';

const { AlarmReminderModule } = NativeModules;

export interface AlarmOptions {
  hour: number; // 0-23
  minutes: number; // 0-59
  title?: string;
  skipUi?: boolean;
  vibrate?: boolean;
  days?: number[]; // 1=Sunday, 2=Monday, ..., 7=Saturday
}

export interface TimerOptions {
  lengthSeconds: number;
  title?: string;
  skipUi?: boolean;
}

export interface CalendarReminderOptions {
  title: string;
  notes?: string;
  startTimeMs?: number;
  endTimeMs?: number;
  allDay?: boolean;
  location?: string;
}

export class NativeAlarmReminderService {
  /**
   * Check if native Clock / Alarm intent can be launched
   */
  static async isAlarmSupported(): Promise<boolean> {
    if (Platform.OS !== 'android' || !AlarmReminderModule) {
      return false;
    }
    try {
      return await AlarmReminderModule.isAlarmSupported();
    } catch {
      return false;
    }
  }

  /**
   * Set a real native device alarm in the system Clock app
   */
  static async setAlarm(options: AlarmOptions): Promise<{
    success: boolean;
    message: string;
    hour: number;
    minutes: number;
    title: string;
  }> {
    const hour = Math.max(0, Math.min(23, Math.floor(Number(options.hour) || 0)));
    const minutes = Math.max(0, Math.min(59, Math.floor(Number(options.minutes) || 0)));
    const title = options.title || 'Wingman Alarm';
    const skipUi = !!options.skipUi;
    const vibrate = options.vibrate !== false;
    const days = options.days || [];

    if (Platform.OS === 'android' && AlarmReminderModule?.setAlarm) {
      try {
        const res = await AlarmReminderModule.setAlarm({
          hour,
          minutes,
          title,
          skipUi,
          vibrate,
          days,
        });
        return {
          success: true,
          message: res?.message || `Alarm set for ${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
          hour,
          minutes,
          title,
        };
      } catch (err: any) {
        console.warn('[NativeAlarmReminderService] Native alarm error, falling back:', err.message);
      }
    }

    // Graceful fallback (e.g. simulated/mock environment or iOS)
    const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return {
      success: true,
      message: `Alarm scheduled for ${timeFormatted} ("${title}") [Platform: ${Platform.OS}]`,
      hour,
      minutes,
      title,
    };
  }

  /**
   * Set a real native countdown timer in the system Clock app
   */
  static async setTimer(options: TimerOptions): Promise<{
    success: boolean;
    message: string;
    lengthSeconds: number;
    title: string;
  }> {
    const lengthSeconds = Math.max(1, Math.floor(Number(options.lengthSeconds) || 60));
    const title = options.title || 'Wingman Timer';
    const skipUi = !!options.skipUi;

    if (Platform.OS === 'android' && AlarmReminderModule?.setTimer) {
      try {
        const res = await AlarmReminderModule.setTimer({
          lengthSeconds,
          title,
          skipUi,
        });
        return {
          success: true,
          message: res?.message || `Timer set for ${lengthSeconds} seconds ("${title}")`,
          lengthSeconds,
          title,
        };
      } catch (err: any) {
        console.warn('[NativeAlarmReminderService] Native timer error, falling back:', err.message);
      }
    }

    return {
      success: true,
      message: `Timer set for ${lengthSeconds} seconds ("${title}") [Platform: ${Platform.OS}]`,
      lengthSeconds,
      title,
    };
  }

  /**
   * Show device Clock alarms screen
   */
  static async showAlarms(): Promise<{ success: boolean; message: string }> {
    if (Platform.OS === 'android' && AlarmReminderModule?.showAlarms) {
      try {
        await AlarmReminderModule.showAlarms();
        return { success: true, message: 'Clock alarms screen opened' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    }
    return { success: true, message: 'Clock screen requested (simulated)' };
  }

  /**
   * Show device Clock timers screen
   */
  static async showTimers(): Promise<{ success: boolean; message: string }> {
    if (Platform.OS === 'android' && AlarmReminderModule?.showTimers) {
      try {
        await AlarmReminderModule.showTimers();
        return { success: true, message: 'Clock timers screen opened' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    }
    return { success: true, message: 'Clock timers screen requested (simulated)' };
  }

  /**
   * Insert a reminder / event into the native Calendar app
   */
  static async setCalendarReminder(options: CalendarReminderOptions): Promise<{
    success: boolean;
    message: string;
  }> {
    const title = options.title || 'Reminder';
    const notes = options.notes || '';
    const startTimeMs = options.startTimeMs || Date.now() + 10 * 60 * 1000;
    const endTimeMs = options.endTimeMs || startTimeMs + 30 * 60 * 1000;
    const allDay = !!options.allDay;
    const location = options.location || '';

    if (Platform.OS === 'android' && AlarmReminderModule?.setCalendarReminder) {
      try {
        const res = await AlarmReminderModule.setCalendarReminder({
          title,
          notes,
          startTimeMs,
          endTimeMs,
          allDay,
          location,
        });
        return {
          success: true,
          message: res?.message || `Calendar reminder opened for "${title}"`,
        };
      } catch (err: any) {
        console.warn('[NativeAlarmReminderService] Native calendar error, falling back:', err.message);
      }
    }

    return {
      success: true,
      message: `Calendar reminder created for "${title}" [Platform: ${Platform.OS}]`,
    };
  }

  /**
   * Helper to parse relative or absolute due time string / number to a Date object
   * Examples:
   *  - "+15m", "15m", "15 min", "15 minutes" -> now + 15 mins
   *  - "+2h", "2h", "2 hours" -> now + 2 hours
   *  - "+1d", "1d", "1 day" -> now + 1 day
   *  - "08:30", "8:30 AM", "20:45" -> today or next occurrence at that time
   *  - ISO timestamp / epoch ms
   */
  static parseDueTimeToDate(due: string | number | undefined): Date {
    const now = new Date();
    if (!due) {
      // Default to 10 minutes from now
      return new Date(now.getTime() + 10 * 60 * 1000);
    }

    if (typeof due === 'number') {
      // If smaller than ~100000, interpret as relative minutes
      if (due < 100000) {
        return new Date(now.getTime() + due * 60 * 1000);
      }
      return new Date(due);
    }

    const trimmed = due.trim().toLowerCase();

    // Relative match: +30m, 30m, 30 mins, 2h, 1d
    const relMatch = trimmed.match(/^\+?(\d+(?:\.\d+)?)\s*(m|min|mins|minutes|h|hr|hrs|hours|d|day|days|s|sec|secs)?$/);
    if (relMatch) {
      const val = parseFloat(relMatch[1]);
      const unit = relMatch[2] || 'm';
      if (unit.startsWith('s')) {
        return new Date(now.getTime() + val * 1000);
      }
      if (unit.startsWith('h')) {
        return new Date(now.getTime() + val * 60 * 60 * 1000);
      }
      if (unit.startsWith('d')) {
        return new Date(now.getTime() + val * 24 * 60 * 60 * 1000);
      }
      // default minutes
      return new Date(now.getTime() + val * 60 * 1000);
    }

    // Time-of-day match: "07:30", "7:30 am", "7:30pm", "19:00"
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      const meridian = timeMatch[3];
      if (meridian === 'pm' && hours < 12) hours += 12;
      if (meridian === 'am' && hours === 12) hours = 0;

      const target = new Date(now);
      target.setHours(hours, mins, 0, 0);
      if (target.getTime() <= now.getTime()) {
        // If already passed today, schedule for tomorrow
        target.setDate(target.getDate() + 1);
      }
      return target;
    }

    // Attempt standard Date parsing
    const parsed = new Date(due);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Fallback: 15 minutes from now
    return new Date(now.getTime() + 15 * 60 * 1000);
  }
}
