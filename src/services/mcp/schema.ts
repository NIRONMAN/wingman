import { McpToolDefinition } from '../../types/mcp';

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'simulate_call',
    description: 'Triggers a realistic incoming phone call screen on the user mobile device with customizable caller details, ringtone, vibration, and TTS speech playback when answered (ideal for rescue calls or urgent spoken briefs).',
    category: 'interaction',
    inputSchema: {
      type: 'object',
      properties: {
        callerName: {
          type: 'string',
          description: 'Display name of the incoming caller (e.g., "Hermes AI", "Emergency Rescue", "Doctor Clinic")',
          default: 'Hermes Assistant',
        },
        callerNumber: {
          type: 'string',
          description: 'Simulated phone number or caller ID (e.g., "+1 (555) 019-2834")',
          default: '+1 (800) HERMES-AI',
        },
        callerAvatarUrl: {
          type: 'string',
          description: 'Optional URL for the caller avatar image',
        },
        ttsScript: {
          type: 'string',
          description: 'Spoken speech script read by Hermes once the user answers the call',
          default: 'Hi, this is Hermes. I noticed you requested an urgent voice check-in.',
        },
        autoDeclineTimeoutSec: {
          type: 'number',
          description: 'Seconds to ring before automatically giving up if unanswered',
          default: 30,
        },
      },
      required: ['callerName'],
    },
  },
  {
    name: 'send_notification',
    description: 'Dispatches a heads-up native mobile notification with title, body, and customizable actionable response buttons.',
    category: 'interaction',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title of the notification',
        },
        message: {
          type: 'string',
          description: 'The detailed message content',
        },
        actions: {
          type: 'array',
          description: 'Optional list of interactive action buttons for the user',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Action identifier' },
              title: { type: 'string', description: 'Button text' },
              style: { type: 'string', enum: ['default', 'cancel', 'destructive'], default: 'default' },
            },
            required: ['id', 'title'],
          },
        },
      },
      required: ['title', 'message'],
    },
  },
  {
    name: 'trigger_haptics',
    description: 'Triggers physical tactile vibration feedback on the mobile device. Supports discrete patterns (light, heavy, alert) or Morse code messages.',
    category: 'hardware',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          enum: ['light', 'heavy', 'alert', 'morse'],
          description: 'Haptic feedback style. "morse" vibrates a textual message in Morse code.',
          default: 'light',
        },
        morseMessage: {
          type: 'string',
          description: 'Optional text string to encode into Morse code vibrations when pattern="morse"',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'toggle_flashlight',
    description: 'Controls the physical rear camera torch / flashlight on the smartphone (turn on, turn off, or pulse strobe).',
    category: 'hardware',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['on', 'off', 'strobe'],
          description: 'Action mode for the flashlight',
        },
        durationSec: {
          type: 'number',
          description: 'Optional auto-off duration in seconds',
          default: 5,
        },
        strobeIntervalMs: {
          type: 'number',
          description: 'Strobe cycle period in milliseconds when mode="strobe" (min: 80ms)',
          default: 150,
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'capture_snapshot',
    description: 'Triggers smartphone camera capture (rear or front lens) to feed real-time visual frames into Hermes vision processing.',
    category: 'hardware',
    inputSchema: {
      type: 'object',
      properties: {
        cameraType: {
          type: 'string',
          enum: ['back', 'front'],
          description: 'Which camera lens to use',
          default: 'back',
        },
        quality: {
          type: 'number',
          description: 'Compression quality (0.1 to 1.0)',
          default: 0.8,
        },
      },
    },
  },
  {
    name: 'get_device_telemetry',
    description: 'Retrieves live smartphone device telemetry including battery %, charging state, network connectivity type, OS version, and device model.',
    category: 'telemetry',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'access_clipboard',
    description: 'Reads or writes text content from/to the device clipboard.',
    category: 'system',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['read', 'write'],
          description: 'Whether to read from clipboard or write text into it',
        },
        text: {
          type: 'string',
          description: 'Text string to copy into clipboard when action="write"',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'set_alarm_or_timer',
    description: 'Sets a device timer or alert alarm with countdown duration and label.',
    category: 'system',
    inputSchema: {
      type: 'object',
      properties: {
        durationSeconds: {
          type: 'number',
          description: 'Duration for the timer in seconds',
        },
        label: {
          type: 'string',
          description: 'Label or purpose of the timer/alarm',
          default: 'Hermes Timer',
        },
        notifyWhenDone: {
          type: 'boolean',
          description: 'Whether to dispatch a native notification and haptic buzz when timer reaches zero',
          default: true,
        },
      },
      required: ['durationSeconds'],
    },
  },
  {
    name: 'set_alarm',
    description: 'Sets a physical device alarm on the user smartphone via native Clock system (specifying hour 0-23, minutes 0-59, label, vibrate, and repeating days).',
    category: 'hardware',
    inputSchema: {
      type: 'object',
      properties: {
        hour: {
          type: 'number',
          description: 'Hour of the day in 24-hour format (0-23)',
        },
        minutes: {
          type: 'number',
          description: 'Minute of the hour (0-59)',
          default: 0,
        },
        label: {
          type: 'string',
          description: 'Label or purpose of the alarm (e.g., "Wake Up", "Team Standup", "Flight to NYC")',
          default: 'Wingman Alarm',
        },
        skipUi: {
          type: 'boolean',
          description: 'Whether to set the alarm silently without foregrounding the Clock app interface',
          default: false,
        },
        vibrate: {
          type: 'boolean',
          description: 'Whether device should vibrate during the alarm',
          default: true,
        },
        days: {
          type: 'array',
          items: { type: 'number' },
          description: 'Optional repeating days of week (1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday)',
        },
      },
      required: ['hour'],
    },
  },
  {
    name: 'set_reminder',
    description: 'Schedules a physical smartphone reminder or calendar event with title, notes, and due date/time (supports relative time like "+15m", "2h", or exact timestamps/time).',
    category: 'system',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title or short summary of the reminder (e.g., "Call dentist", "Drink water", "Submit invoice")',
        },
        notes: {
          type: 'string',
          description: 'Detailed notes or instructions for the reminder',
        },
        dueTime: {
          type: 'string',
          description: 'Target due time: can be relative (e.g., "+15m", "30m", "2h", "1d"), time of day (e.g. "14:30", "7:00 PM"), or ISO-8601 string',
        },
        target: {
          type: 'string',
          enum: ['app_notification', 'calendar', 'both'],
          description: 'Where to dispatch the reminder: in-app notification with alert/haptic, native Calendar app event, or both',
          default: 'both',
        },
        allDay: {
          type: 'boolean',
          description: 'Whether this is an all-day reminder/event',
          default: false,
        },
        location: {
          type: 'string',
          description: 'Optional physical location or meeting link',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_reminders',
    description: 'Lists active and scheduled reminders, alarms, and timers currently pending or triggered on the mobile device.',
    category: 'system',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'triggered', 'all'],
          description: 'Filter reminders by status (default: pending)',
          default: 'pending',
        },
      },
    },
  },
  {
    name: 'cancel_reminder',
    description: 'Cancels a pending reminder or timer by its unique reminder ID.',
    category: 'system',
    inputSchema: {
      type: 'object',
      properties: {
        reminderId: {
          type: 'string',
          description: 'ID of the reminder to cancel',
        },
      },
      required: ['reminderId'],
    },
  },
  {
    name: 'show_clock',
    description: 'Opens the physical device Clock application to show all configured alarms or timers.',
    category: 'system',
    inputSchema: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          enum: ['alarms', 'timers'],
          description: 'Which tab to show in Clock app: alarms or timers',
          default: 'alarms',
        },
      },
    },
  },
];
