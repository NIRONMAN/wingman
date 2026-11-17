import { McpRegistry } from '../src/services/mcp/registry';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useCallStore } from '../src/store/useCallStore';
import { useMcpLogStore } from '../src/store/useMcpLogStore';

describe('McpRegistry', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetDefaults();
    useCallStore.getState().resetCallState();
    useMcpLogStore.getState().clearLogs();
  });

  it('lists all physical tools conforming to MCP schemas', () => {
    const { tools } = McpRegistry.listTools();
    expect(tools.length).toBe(13);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('simulate_call');
    expect(toolNames).toContain('send_notification');
    expect(toolNames).toContain('trigger_haptics');
    expect(toolNames).toContain('toggle_flashlight');
    expect(toolNames).toContain('capture_snapshot');
    expect(toolNames).toContain('get_device_telemetry');
    expect(toolNames).toContain('access_clipboard');
    expect(toolNames).toContain('set_alarm_or_timer');
    expect(toolNames).toContain('set_alarm');
    expect(toolNames).toContain('set_reminder');
    expect(toolNames).toContain('list_reminders');
    expect(toolNames).toContain('cancel_reminder');
    expect(toolNames).toContain('show_clock');

    tools.forEach((tool) => {
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    });
  });

  it('executes simulate_call and updates CallStore', async () => {
    const res = await McpRegistry.executeTool('simulate_call', {
      callerName: 'Rescue Caller',
      callerNumber: '+1 800-RESCUE',
      ttsScript: 'Please excuse yourself.',
    });

    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain('Rescue Caller');
    expect(useCallStore.getState().state).toBe('ringing');
    expect(useCallStore.getState().currentCall?.callerName).toBe('Rescue Caller');
  });

  it('executes toggle_flashlight in on, off, and strobe modes', async () => {
    const resOn = await McpRegistry.executeTool('toggle_flashlight', { mode: 'on' });
    expect(resOn.content[0].text).toContain('Flashlight');

    const resStrobe = await McpRegistry.executeTool('toggle_flashlight', { mode: 'strobe', durationSec: 1 });
    expect(resStrobe.content[0].text).toContain('strobing');

    const resOff = await McpRegistry.executeTool('toggle_flashlight', { mode: 'off' });
    expect(resOff.content[0].text).toContain('Flashlight');
  });

  it('executes trigger_haptics with light, heavy, alert, and morse patterns', async () => {
    const resLight = await McpRegistry.executeTool('trigger_haptics', { pattern: 'light' });
    expect(resLight.content[0].text).toContain('Light impact');

    const resMorse = await McpRegistry.executeTool('trigger_haptics', {
      pattern: 'morse',
      morseMessage: 'SOS',
    });
    expect(resMorse.content[0].text).toContain('Morse pattern for "SOS"');
  });

  it('retrieves live device telemetry via get_device_telemetry', async () => {
    const res = await McpRegistry.executeTool('get_device_telemetry', {});
    expect(res.content[0].type).toBe('text');
    const parsed = JSON.parse(res.content[0].text!);
    expect(parsed.batteryLevel).toBeDefined();
    expect(parsed.networkType).toBeDefined();
    expect(parsed.systemName).toBeDefined();
  });

  it('reads and writes clipboard text via access_clipboard', async () => {
    const writeRes = await McpRegistry.executeTool('access_clipboard', {
      action: 'write',
      text: 'Wingman Secret Token',
    });
    expect(writeRes.content[0].text).toContain('Successfully wrote');

    const readRes = await McpRegistry.executeTool('access_clipboard', { action: 'read' });
    expect(readRes.content[0].text).toBe('Wingman Secret Token');
  });

  it('captures camera snapshot via capture_snapshot', async () => {
    const res = await McpRegistry.executeTool('capture_snapshot', { cameraType: 'back' });
    expect(res.content.length).toBe(2);
    expect(res.content[0].type).toBe('text');
    expect(res.content[1].type).toBe('image');
    expect(res.content[1].data).toBeDefined();
    expect(res.content[1].mimeType).toBe('image/jpeg');
  });

  it('enforces hardware permissions and denies execution when permission disabled', async () => {
    // Disable camera permission in settings
    useSettingsStore.getState().setPermission('allowCamera', false);

    const res = await McpRegistry.executeTool('capture_snapshot', {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Permission denied');

    // Check log status in useMcpLogStore
    const logs = useMcpLogStore.getState().logs;
    expect(logs[0].status).toBe('denied');
  });

  it('handles unknown tool gracefully', async () => {
    const res = await McpRegistry.executeTool('non_existent_tool', {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Unknown MCP tool');
  });

  it('sets native clock alarm via set_alarm', async () => {
    const res = await McpRegistry.executeTool('set_alarm', {
      hour: 7,
      minutes: 30,
      label: 'Wake Up Flight',
    });
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain('Alarm scheduled successfully');
    expect(res.content[0].text).toContain('Wake Up Flight');
  });

  it('schedules and cancels reminder via set_reminder, list_reminders, and cancel_reminder', async () => {
    const setRes = await McpRegistry.executeTool('set_reminder', {
      title: 'Buy Groceries',
      notes: 'Almond milk and coffee',
      dueTime: '+30m',
      target: 'app_notification',
    });
    expect(setRes.isError).toBeFalsy();
    expect(setRes.content[0].text).toContain('Buy Groceries');

    // List reminders
    const listRes = await McpRegistry.executeTool('list_reminders', { status: 'pending' });
    expect(listRes.isError).toBeFalsy();
    const list = JSON.parse(listRes.content[0].text!);
    expect(Array.isArray(list)).toBe(true);
    const grocery = list.find((i: any) => i.title === 'Buy Groceries');
    expect(grocery).toBeDefined();

    // Cancel reminder
    const cancelRes = await McpRegistry.executeTool('cancel_reminder', { reminderId: grocery.id });
    expect(cancelRes.content[0].text).toContain('cancelled successfully');
  });

  it('opens clock view via show_clock', async () => {
    const res = await McpRegistry.executeTool('show_clock', { view: 'alarms' });
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain('Clock alarms screen');
  });
});
