# Wingman 📱✈️
### Mobile Chat Companion & Physical MCP Actuator Node for Hermes

**Wingman** is a React Native mobile application (TypeScript + Hermes engine) designed as the primary mobile companion for personal AI assistant boards, starting with **Hermes**.

Wingman fulfills two intertwined roles:
1. **Interactive Chat Client**: A seamless mobile conversation interface to chat with Hermes (text, streaming responses, voice memos, quick action shortcuts).
2. **Physical MCP Actuator Node**: Exposes native smartphone hardware and OS features as Model Context Protocol (MCP) tools directly to Hermes. When Hermes decides an action is needed (or the user commands one), Hermes executes physical actions on the phone in real time over JSON-RPC 2.0.

---

## Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │                      HERMES AI                         │
 │           (Personal Assistant Server / Node)           │
 └─────────────────────────▲──────────────────────────────┘
                           │
             WebSocket / JSON-RPC 2.0
                           │
      ┌────────────────────┴─────────────────────┐
      │                                          │
 ┌────▼─────────────────┐            ┌───────────▼────────────┐
 │  Chat Channel        │            │  MCP Tool Channel      │
 │  - Bi-directional    │            │  - tools/list          │
 │  - Streaming tokens  │            │  - tools/call          │
 │  - Voice memos       │            │  - Hardware execution  │
 └──────────┬───────────┘            └───────────┬────────────┘
            │                                    │
            │     ┌──────────────────────────────┘
            │     │
┌───────────▼─────▼───────────────────────────────────────────┐
│                      WINGMAN CLIENT                         │
│                                                             │
│  ┌────────────────────┐    ┌──────────────────────────────┐ │
│  │   UI & Screens     │    │     Physical MCP Registry    │ │
│  │  - ChatScreen      │    │  - simulate_call             │ │
│  │  - CallScreen (TTS)│    │  - toggle_flashlight         │ │
│  │  - SettingsScreen  │    │  - trigger_haptics / morse   │ │
│  │  - MCP Live Logs   │    │  - get_device_telemetry      │ │
│  └────────────────────┘    │  - capture_snapshot          │ │
│                            │  - access_clipboard          │ │
│  ┌────────────────────┐    │  - send_notification         │ │
│  │    Zustand State   │    │  - set_alarm_or_timer        │ │
│  │  - useChatStore    │    └──────────────┬───────────────┘ │
│  │  - useCallStore    │                   │                 │
│  │  - useSettingsStore│    ┌──────────────▼───────────────┐ │
│  │  - useMcpLogStore  │    │   Hardware Abstraction Layer │ │
│  └────────────────────┘    │ (Torch, Sound, Haptic, Info) │ │
│                            └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Modules & Features

### 1. Hermes Chat Interface (`src/screens/ChatScreen.tsx`)
- **Conversation Stream**: Markdown rendering with real-time word-by-word streaming token indicators.
- **Physical Action Badges**: Inline visual chips (`ToolExecutionBadge`) embedded into message bubbles indicating tool invocation, running status, duration, and expandable parameters.
- **Quick Action Drawer**: Instant physical triggers for:
  - 🚨 **Rescue Call**: Ask Hermes to immediately call your phone with an urgent pretext.
  - 🎙️ **Voice Memo**: Pulsing audio recorder to send spoken briefs to Hermes.
  - 📸 **Snap & Inspect**: Capture rear/front camera photo and attach to Hermes' vision input.
  - 🔦 **Torch Strobe**: Pulse the hardware camera flashlight.
  - 🔋 **Device Telemetry**: Send battery %, charging status, and network health report.
  - ⏰ **Set Alarm**: Quick shortcut to configure a native smartphone alarm.
  - 🔔 **Set Reminder**: Quick shortcut to schedule a reminder.

### 2. Physical MCP Tool Registry (`src/services/mcp/`)
Exposes physical mobile tools over standard MCP JSON-RPC:

| MCP Tool Name | Description | Key Parameters |
|---|---|---|
| `simulate_call` | Triggers a full-screen realistic incoming call screen with ringtone, vibration, and Hermes TTS speech playback when answered. | `callerName`, `callerNumber`, `ttsScript`, `autoDeclineTimeoutSec` |
| `send_notification` | Dispatches heads-up native mobile notification with interactive action buttons. | `title`, `message`, `actions: [{id, title}]` |
| `trigger_haptics` | Triggers physical vibrations on phone chassis. Supports discrete patterns or text encoded into Morse code vibrations. | `pattern: 'light' \| 'heavy' \| 'alert' \| 'morse'`, `morseMessage` |
| `toggle_flashlight` | Direct hardware torch control on the smartphone rear camera. | `mode: 'on' \| 'off' \| 'strobe'`, `durationSec`, `strobeIntervalMs` |
| `capture_snapshot` | Takes photo using rear or front lens to feed visual frames back to Hermes vision processing. | `cameraType: 'back' \| 'front'`, `quality` |
| `get_device_telemetry` | Reports battery %, charging state, network connectivity, volume, device model, and OS version. | None |
| `access_clipboard` | Reads or writes text from/to device clipboard. | `action: 'read' \| 'write'`, `text` |
| `set_alarm` | Sets a real native system clock alarm in the user's default Clock app (Google Clock, Moto Clock, etc.) with hour, minute, vibrate, and days. | `hour`, `minutes`, `label`, `skipUi`, `vibrate`, `days` |
| `set_reminder` | Schedules a reminder with title, notes, and due time (relative like `+15m`, or time-of-day/ISO). Dispatches in-app notification alerts and/or launches native Calendar app event. | `title`, `notes`, `dueTime`, `target`, `allDay`, `location` |
| `list_reminders` | Lists all active and scheduled reminders and alarms with remaining minutes and status. | `status: 'pending' \| 'triggered' \| 'all'` |
| `cancel_reminder` | Cancels a scheduled reminder or timer by its tracking ID. | `reminderId` |
| `show_clock` | Opens the device Clock app directly to inspect alarms or timers. | `view: 'alarms' \| 'timers'` |
| `set_alarm_or_timer` | Sets native device countdown timer or alarm with haptic buzz and alert on completion. | `durationSeconds`, `label`, `notifyWhenDone` |

### 3. Realistic Simulated Call System (`src/screens/CallScreen.tsx`)
- **Incoming Call State**: Full-screen overlay resembling iOS/Android native phone dialers. Pulsating caller avatar rings, custom caller ID ("Doctor Clinic", "Hermes Priority Dispatch"), continuous vibration & ringtone audio, and Decline / Accept buttons.
- **Active Call State**: Timer counter ("00:14"), speaker toggle, mute microphone toggle, keypad, and Hermes live text-to-speech audio transcript playback.

### 4. Settings & Device Control Center (`src/screens/SettingsScreen.tsx`)
- **Connection Profile**: Hermes Server WebSocket URL (`ws://127.0.0.1:8765`), Bearer Auth Token, Auto-connect switch.
- **Hardware Permission Toggles**: Granular privacy controls allowing/denying camera, flashlight, haptics, simulated calls, notifications, clipboard, and alarms & reminders.
- **Diagnostic Self-Tests**: One-tap local verification buttons:
  - Test Rescue Call
  - Test Haptic Buzz
  - Test Flashlight Strobe
  - Test Alarm (`set_alarm`)
  - Test Reminder (`set_reminder`)
  - Open Clock (`show_clock`)
  - Test Telemetry Query
  - Ping Hermes Server
- **Live MCP Execution Log**: Real-time inspector displaying all tool calls received from Hermes, execution status, elapsed milliseconds, arguments, and return payloads.

---

## Getting Started

### Prerequisites
- Node.js >= 18
- npm or pnpm
- Android Studio / Xcode (for running on emulator or physical phone)

### Installation
```bash
# Clone or navigate to the project directory
cd /home/niro/Projects/wingman

# Dependencies are already installed via npm install
```

### Running the Mock Hermes Server
Wingman includes a Node.js mock Hermes server script (`test-hermes-server.js`) that simulates the Hermes AI assistant, supports streaming responses, and dispatches MCP tool calls over WebSocket:

```bash
npm run mock-server
```

Once running:
- Server listens on `ws://localhost:8765`
- Try commands in the terminal console:
  - `call` — Triggers an incoming simulated call on all connected Wingman phones.
  - `torch` — Dispatches flashlight strobe tool call.
  - `haptic` — Dispatches haptic alert pattern.
  - `tools` — Queries phone physical MCP tools via `tools/list`.
  - `msg <text>` — Streams message to the phone.
- Or chat directly in the app:
  - Type `/rescue` or *"Can you call my phone?"* -> Hermes triggers `simulate_call`!
  - Type `/torch` or *"Turn on my flashlight"* -> Hermes triggers `toggle_flashlight`!
  - Type `/telemetry` or *"Check my battery"* -> Hermes reads telemetry and replies!

### Running Unit & Integration Tests
```bash
npm test
```
All 21 unit and end-to-end integration tests run via Jest.

### Checking TypeScript Types
```bash
npm run typecheck
```

---

## Project Structure
```
wingman/
├── src/
│   ├── types/                  # TypeScript interfaces (MCP, Hermes, Chat, Call, Settings)
│   ├── services/
│   │   ├── mcp/
│   │   │   ├── schema.ts       # Tool definitions & JSON schemas
│   │   │   ├── registry.ts     # MCP Tool Registry & permissions validation
│   │   │   └── hardware/       # Hardware services with safe simulator fallbacks
│   │   │       ├── nativeHaptics.ts
│   │   │       ├── nativeTorch.ts
│   │   │       ├── nativeDeviceInfo.ts
│   │   │       ├── nativeSound.ts
│   │   │       ├── nativeCamera.ts
│   │   │       ├── nativeClipboard.ts
│   │   │       └── nativeNotification.ts
│   │   └── hermes/
│   │       ├── protocol.ts     # JSON-RPC 2.0 message parser and encoder
│   │       └── client.ts       # Dual-channel WebSocket client & reconnect logic
│   ├── store/
│   │   ├── useChatStore.ts     # Chat history, streaming state, tool badges
│   │   ├── useCallStore.ts     # Simulated call states, timers, TTS playback
│   │   ├── useSettingsStore.ts # Server profile, hardware permission toggles
│   │   └── useMcpLogStore.ts   # Live MCP tool execution logs
│   ├── screens/
│   │   ├── ChatScreen.tsx      # Conversation UI, streaming, quick actions, voice input
│   │   ├── CallScreen.tsx      # Realistic incoming / active simulated call screen
│   │   └── SettingsScreen.tsx  # Device control center, permissions, self-tests, live logs
│   ├── components/
│   │   ├── MessageBubble.tsx   # Markdown message bubble with tool badge
│   │   ├── ToolExecutionBadge.tsx # Visual chip for MCP hardware actions
│   │   ├── QuickActionsDrawer.tsx # Drawer for quick physical triggers
│   │   ├── AudioRecordModal.tsx # Voice memo recording UI
│   │   └── ConnectionStatusBanner.tsx # Dynamic connection state banner
│   └── navigation/
│       └── RootNavigator.tsx   # React Navigation Native Stack
├── __tests__/                  # Unit and E2E integration test suites
├── test-hermes-server.js       # Mock Hermes AI WebSocket server & CLI
├── App.tsx                     # Main application entry component
├── index.js                    # React Native app registration
├── package.json
└── tsconfig.json
```
