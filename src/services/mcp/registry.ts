import { MCP_TOOLS } from './schema';
import { McpToolDefinition, McpToolResult } from '../../types/mcp';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useMcpLogStore } from '../../store/useMcpLogStore';
import { useCallStore } from '../../store/useCallStore';
import { NativeHapticsService } from './hardware/nativeHaptics';
import { NativeTorchService } from './hardware/nativeTorch';
import { NativeDeviceInfoService } from './hardware/nativeDeviceInfo';
import { NativeClipboardService } from './hardware/nativeClipboard';
import { NativeCameraService } from './hardware/nativeCamera';
import { NativeNotificationService } from './hardware/nativeNotification';
import { NativeAlarmReminderService } from './hardware/nativeAlarmReminder';
import { useReminderStore } from '../../store/useReminderStore';

export class McpRegistry {
  private static activeTimers: Map<string, any> = new Map();

  /**
   * Return the list of all available MCP tools supported by this node.
   */
  static listTools(): { tools: McpToolDefinition[] } {
    return { tools: MCP_TOOLS };
  }

  /**
   * Find a tool definition by name
   */
  static getTool(name: string): McpToolDefinition | undefined {
    return MCP_TOOLS.find((t) => t.name === name);
  }

  /**
   * Execute an MCP tool request
   */
  static async executeTool(name: string, args: Record<string, any> = {}): Promise<McpToolResult> {
    const startTime = Date.now();
    const logId = useMcpLogStore.getState().addLog({
      toolName: name,
      timestamp: startTime,
      args,
      status: 'pending',
    });

    const permissions = useSettingsStore.getState().permissions;

    try {
      let result: McpToolResult;

      switch (name) {
        case 'simulate_call': {
          if (!permissions.allowSimulatedCalls) {
            throw new Error('Permission denied: simulated_call is disabled in Wingman settings');
          }
          const callerName = args.callerName || 'Hermes Assistant';
          const callerNumber = args.callerNumber || '+1 (800) HERMES-AI';
          const ttsScript = args.ttsScript || "Hi, this is Hermes. I'm following up on your request. Everything is in order.";
          const autoDeclineTimeoutSec = args.autoDeclineTimeoutSec || 30;

          useCallStore.getState().triggerIncomingCall({
            callId: `call_${Date.now()}`,
            callerName,
            callerNumber,
            callerAvatarUrl: args.callerAvatarUrl,
            ttsScript,
            autoDeclineTimeoutSec,
          });

          result = {
            content: [
              {
                type: 'text',
                text: `Simulated incoming call initiated for "${callerName}" (${callerNumber}). Device is now ringing with realistic UI and audio feedback.`,
              },
            ],
          };
          break;
        }

        case 'send_notification': {
          if (!permissions.allowNotifications) {
            throw new Error('Permission denied: notifications are disabled in Wingman settings');
          }
          const title = args.title || 'Hermes Alert';
          const message = args.message || 'Action required';
          const actions = args.actions || [];

          // Trigger discrete haptic on notification
          NativeHapticsService.trigger('alert');

          const response = await NativeNotificationService.sendNotification(title, message, actions);
          result = {
            content: [
              {
                type: 'text',
                text: `Notification displayed successfully.${response.actionClicked ? ` User clicked action: "${response.actionClicked}"` : ''}`,
              },
            ],
          };
          break;
        }

        case 'trigger_haptics': {
          if (!permissions.allowHaptics) {
            throw new Error('Permission denied: haptics are disabled in Wingman settings');
          }
          const pattern = args.pattern || 'light';
          const morseMessage = args.morseMessage;

          const hapticRes = await NativeHapticsService.trigger(pattern, morseMessage);
          result = {
            content: [
              {
                type: 'text',
                text: `Haptics executed: ${hapticRes.details}`,
              },
            ],
          };
          break;
        }

        case 'toggle_flashlight': {
          if (!permissions.allowFlashlight) {
            throw new Error('Permission denied: flashlight is disabled in Wingman settings');
          }
          const mode = args.mode || 'on';
          const durationSec = args.durationSec;
          const strobeIntervalMs = args.strobeIntervalMs;

          const torchRes = await NativeTorchService.setTorch(mode, {
            durationSec,
            strobeIntervalMs,
          });

          result = {
            content: [
              {
                type: 'text',
                text: `Flashlight state updated: ${torchRes.details}`,
              },
            ],
          };
          break;
        }

        case 'capture_snapshot': {
          if (!permissions.allowCamera) {
            throw new Error('Permission denied: camera is disabled in Wingman settings');
          }
          const cameraType = args.cameraType || 'back';
          const quality = args.quality || 0.8;

          const snapshot = await NativeCameraService.captureSnapshot({ cameraType, quality });
          result = {
            content: [
              {
                type: 'text',
                text: `Captured ${snapshot.width}x${snapshot.height} image using ${snapshot.cameraType} camera at ${snapshot.timestamp}.`,
              },
              {
                type: 'image',
                data: snapshot.base64Data,
                mimeType: snapshot.mimeType,
                uri: snapshot.uri,
              },
            ],
          };
          break;
        }

        case 'get_device_telemetry': {
          const telemetry = await NativeDeviceInfoService.getTelemetry();
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(telemetry, null, 2),
              },
            ],
          };
          break;
        }

        case 'access_clipboard': {
          if (!permissions.allowClipboard) {
            throw new Error('Permission denied: clipboard access is disabled in Wingman settings');
          }
          const action = args.action || 'read';

          if (action === 'write') {
            const textToWrite = args.text || '';
            await NativeClipboardService.setString(textToWrite);
            result = {
              content: [
                {
                  type: 'text',
                  text: `Successfully wrote ${textToWrite.length} characters to device clipboard.`,
                },
              ],
            };
          } else {
            const textRead = await NativeClipboardService.getString();
            result = {
              content: [
                {
                  type: 'text',
                  text: textRead,
                },
              ],
            };
          }
          break;
        }

        case 'set_alarm_or_timer': {
          if (!permissions.allowAlarmsAndReminders) {
            throw new Error('Permission denied: alarms and reminders are disabled in Wingman settings');
          }
          const duration = Math.max(1, Number(args.durationSeconds) || 10);
          const label = args.label || 'Hermes Timer';
          const notify = args.notifyWhenDone !== false;

          // Attempt system clock timer if available
          await NativeAlarmReminderService.setTimer({
            lengthSeconds: duration,
            title: label,
            skipUi: true,
          });

          const timerId = `timer_${Date.now()}`;
          useReminderStore.getState().addReminder({
            id: timerId,
            type: 'timer',
            title: label,
            durationSeconds: duration,
            scheduledTime: Date.now() + duration * 1000,
            target: 'app_notification',
          });

          const handle = setTimeout(() => {
            if (notify) {
              NativeHapticsService.trigger('alert');
              NativeNotificationService.sendNotification(
                `⏰ Timer Complete: ${label}`,
                `Your ${duration} second timer has elapsed.`
              );
            }
            useReminderStore.getState().triggerReminder(timerId);
            McpRegistry.activeTimers.delete(timerId);
          }, duration * 1000);

          McpRegistry.activeTimers.set(timerId, handle);

          result = {
            content: [
              {
                type: 'text',
                text: `Timer "${label}" set for ${duration} seconds (ID: ${timerId}). Device will alert when complete.`,
              },
            ],
          };
          break;
        }

        case 'set_alarm': {
          if (!permissions.allowAlarmsAndReminders) {
            throw new Error('Permission denied: alarms and reminders are disabled in Wingman settings');
          }
          const hour = args.hour !== undefined ? Math.floor(Number(args.hour)) : 7;
          const minutes = args.minutes !== undefined ? Math.floor(Number(args.minutes)) : 0;
          const label = args.label || 'Wingman Alarm';
          const skipUi = !!args.skipUi;
          const vibrate = args.vibrate !== false;
          const days = Array.isArray(args.days) ? args.days : undefined;

          const alarmRes = await NativeAlarmReminderService.setAlarm({
            hour,
            minutes,
            title: label,
            skipUi,
            vibrate,
            days,
          });

          const now = new Date();
          const alarmDate = new Date(now);
          alarmDate.setHours(hour, minutes, 0, 0);
          if (alarmDate.getTime() <= now.getTime()) {
            alarmDate.setDate(alarmDate.getDate() + 1);
          }

          const reminderItem = useReminderStore.getState().addReminder({
            type: 'alarm',
            title: label,
            scheduledTime: alarmDate.getTime(),
            target: 'native_alarm',
            hour,
            minutes,
          });

          result = {
            content: [
              {
                type: 'text',
                text: `Alarm scheduled successfully: ${alarmRes.message} (ID: ${reminderItem.id}). Native Clock app configured.`,
              },
            ],
          };
          break;
        }

        case 'set_reminder': {
          if (!permissions.allowAlarmsAndReminders) {
            throw new Error('Permission denied: alarms and reminders are disabled in Wingman settings');
          }
          const title = args.title || 'Reminder';
          const notes = args.notes || '';
          const target = args.target || 'both';
          const allDay = !!args.allDay;
          const location = args.location || '';

          const dueDate = NativeAlarmReminderService.parseDueTimeToDate(args.dueTime);
          const scheduledTime = dueDate.getTime();
          const nowMs = Date.now();
          const delayMs = Math.max(1000, scheduledTime - nowMs);

          const reminderItem = useReminderStore.getState().addReminder({
            type: 'reminder',
            title,
            notes,
            scheduledTime,
            target,
          });

          // Schedule in-app heads-up notification trigger
          if (target === 'app_notification' || target === 'both') {
            const timerHandle = setTimeout(() => {
              NativeHapticsService.trigger('alert');
              NativeNotificationService.sendNotification(
                `⏰ Reminder: ${title}`,
                notes || 'Your scheduled reminder is due.'
              );
              useReminderStore.getState().triggerReminder(reminderItem.id);
              McpRegistry.activeTimers.delete(reminderItem.id);
            }, delayMs);
            McpRegistry.activeTimers.set(reminderItem.id, timerHandle);
          }

          // Launch Android Calendar intent if requested
          let calendarMessage = '';
          if (target === 'calendar' || target === 'both') {
            const calRes = await NativeAlarmReminderService.setCalendarReminder({
              title,
              notes,
              startTimeMs: scheduledTime,
              endTimeMs: scheduledTime + (allDay ? 86400000 : 1800000),
              allDay,
              location,
            });
            calendarMessage = ` | ${calRes.message}`;
          }

          const timeFormatted = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateFormatted = dueDate.toLocaleDateString();

          result = {
            content: [
              {
                type: 'text',
                text: `Reminder "${title}" scheduled for ${dateFormatted} ${timeFormatted} (ID: ${reminderItem.id})${calendarMessage}.`,
              },
            ],
          };
          break;
        }

        case 'list_reminders': {
          const filterStatus = args.status || 'pending';
          const allReminders = useReminderStore.getState().reminders;
          const filtered = filterStatus === 'all'
            ? allReminders
            : allReminders.filter((r) => r.status === filterStatus);

          const formattedList = filtered.map((r) => {
            const due = new Date(r.scheduledTime);
            const remainingMin = Math.round((r.scheduledTime - Date.now()) / 60000);
            return {
              id: r.id,
              type: r.type,
              title: r.title,
              notes: r.notes || '',
              status: r.status,
              target: r.target,
              scheduledTime: due.toISOString(),
              remainingMinutes: remainingMin,
            };
          });

          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(formattedList, null, 2),
              },
            ],
          };
          break;
        }

        case 'cancel_reminder': {
          const reminderId = args.reminderId;
          const handle = McpRegistry.activeTimers.get(reminderId);
          if (handle) {
            clearTimeout(handle);
            McpRegistry.activeTimers.delete(reminderId);
          }
          const cancelled = useReminderStore.getState().cancelReminder(reminderId);
          result = {
            content: [
              {
                type: 'text',
                text: cancelled
                  ? `Reminder "${reminderId}" has been cancelled successfully.`
                  : `Reminder "${reminderId}" not found or was already completed.`,
              },
            ],
          };
          break;
        }

        case 'show_clock': {
          const view = args.view === 'timers' ? 'timers' : 'alarms';
          const clockRes = view === 'timers'
            ? await NativeAlarmReminderService.showTimers()
            : await NativeAlarmReminderService.showAlarms();
          result = {
            content: [
              {
                type: 'text',
                text: `Device Clock ${view} screen opened (${clockRes.message}).`,
              },
            ],
          };
          break;
        }

        default:
          throw new Error(`Unknown MCP tool: "${name}"`);
      }

      const durationMs = Date.now() - startTime;
      useMcpLogStore.getState().updateLog(logId, {
        status: 'success',
        result,
        durationMs,
      });

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || 'Tool execution failed';
      const isDenied = errorMsg.includes('Permission denied');

      const errorResult: McpToolResult = {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: ${errorMsg}`,
          },
        ],
      };

      useMcpLogStore.getState().updateLog(logId, {
        status: isDenied ? 'denied' : 'failed',
        errorMessage: errorMsg,
        result: errorResult,
        durationMs,
      });

      return errorResult;
    }
  }
}
