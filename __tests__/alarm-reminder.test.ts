import { NativeAlarmReminderService } from '../src/services/mcp/hardware/nativeAlarmReminder';
import { useReminderStore } from '../src/store/useReminderStore';

describe('NativeAlarmReminderService', () => {
  it('parses relative time strings correctly', () => {
    const before = Date.now();
    const d15m = NativeAlarmReminderService.parseDueTimeToDate('+15m');
    const diffMins = Math.round((d15m.getTime() - before) / 60000);
    expect(diffMins).toBe(15);

    const d2h = NativeAlarmReminderService.parseDueTimeToDate('2h');
    const diffHours = Math.round((d2h.getTime() - before) / 3600000);
    expect(diffHours).toBe(2);

    const d1d = NativeAlarmReminderService.parseDueTimeToDate('+1d');
    const diffDays = Math.round((d1d.getTime() - before) / 86400000);
    expect(diffDays).toBe(1);
  });

  it('parses time of day strings correctly', () => {
    const parsed = NativeAlarmReminderService.parseDueTimeToDate('14:30');
    expect(parsed.getHours()).toBe(14);
    expect(parsed.getMinutes()).toBe(30);

    const parsedAm = NativeAlarmReminderService.parseDueTimeToDate('7:15 am');
    expect(parsedAm.getHours()).toBe(7);
    expect(parsedAm.getMinutes()).toBe(15);

    const parsedPm = NativeAlarmReminderService.parseDueTimeToDate('8:45 pm');
    expect(parsedPm.getHours()).toBe(20);
    expect(parsedPm.getMinutes()).toBe(45);
  });

  it('sets alarm and timer gracefully on non-android or mock environment', async () => {
    const alarmRes = await NativeAlarmReminderService.setAlarm({
      hour: 8,
      minutes: 15,
      title: 'Morning Meeting',
    });
    expect(alarmRes.success).toBe(true);
    expect(alarmRes.hour).toBe(8);
    expect(alarmRes.minutes).toBe(15);
    expect(alarmRes.title).toBe('Morning Meeting');

    const timerRes = await NativeAlarmReminderService.setTimer({
      lengthSeconds: 120,
      title: 'Tea brewing',
    });
    expect(timerRes.success).toBe(true);
    expect(timerRes.lengthSeconds).toBe(120);
  });

  it('handles calendar reminder creation', async () => {
    const calRes = await NativeAlarmReminderService.setCalendarReminder({
      title: 'Dentist Checkup',
      notes: 'Bring insurance card',
    });
    expect(calRes.success).toBe(true);
    expect(calRes.message).toContain('Dentist Checkup');
  });
});

describe('useReminderStore', () => {
  beforeEach(() => {
    useReminderStore.setState({ reminders: [] });
  });

  it('adds, retrieves, and filters reminders', () => {
    const store = useReminderStore.getState();

    const r1 = store.addReminder({
      type: 'reminder',
      title: 'Walk dog',
      scheduledTime: Date.now() + 60000,
    });

    const r2 = store.addReminder({
      type: 'alarm',
      title: 'Wake Up',
      scheduledTime: Date.now() + 3600000,
    });

    expect(useReminderStore.getState().reminders.length).toBe(2);
    expect(useReminderStore.getState().getActiveReminders().length).toBe(2);

    // Trigger r1
    useReminderStore.getState().triggerReminder(r1.id);
    const updatedR1 = useReminderStore.getState().reminders.find((r) => r.id === r1.id);
    expect(updatedR1?.status).toBe('triggered');
    expect(useReminderStore.getState().getActiveReminders().length).toBe(1);

    // Cancel r2
    const cancelled = useReminderStore.getState().cancelReminder(r2.id);
    expect(cancelled).toBe(true);
    const updatedR2 = useReminderStore.getState().reminders.find((r) => r.id === r2.id);
    expect(updatedR2?.status).toBe('cancelled');
    expect(useReminderStore.getState().getActiveReminders().length).toBe(0);
  });
});
