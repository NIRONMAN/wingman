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
];
