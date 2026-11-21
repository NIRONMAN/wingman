# Wingman 📱✈️
### Mobile Chat Companion & Physical MCP Actuator Node for Hermes AI

[![React Native](https://img.shields.io/badge/React_Native-0.76.5-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)
[![Expo SDK 52](https://img.shields.io/badge/Expo_SDK-52-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MCP Protocol](https://img.shields.io/badge/MCP-JSON--RPC_2.0-8A2BE2?style=flat-square&logo=json&logoColor=white)](https://modelcontextprotocol.io)
[![Hermes Engine](https://img.shields.io/badge/Engine-Hermes-F39C12?style=flat-square)](https://hermesengine.dev)
[![Test Suite](https://img.shields.io/badge/Tests-29%20Passed-success?style=flat-square&logo=jest&logoColor=white)](https://jestjs.io)
[![Platforms](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-brightgreen?style=flat-square&logo=android&logoColor=white)](https://android.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**Wingman** is a production-grade React Native mobile application built on Expo SDK 52 and TypeScript, operating on the high-performance Hermes JavaScript runtime. It is engineered as the primary mobile companion for personal AI assistant systems, starting with **Hermes AI**.

Wingman bridges the gap between digital LLM reasoning and the physical world through a **dual-role architecture**:

1. **Interactive Chat Companion**: A responsive mobile conversation UI featuring token-by-token streaming, Markdown rendering, voice memo transmission, quick action shortcuts, and inline tool execution badges.
2. **Physical MCP Actuator Node**: A client-side endpoint exposing native smartphone sensors, actuators, and OS subsystem capabilities directly to Hermes AI via the **Model Context Protocol (MCP)** over persistent JSON-RPC 2.0 WebSockets. Hermes can invoke alarms, calendar reminders, haptic pulses, camera snapshots, flashlights, and lifelike simulated phone calls in real time.

---

## Table of Contents

- [System Architecture](#system-architecture)
  - [Bi-Directional Communication Protocol](#bi-directional-communication-protocol)
  - [Logical Flow Diagram](#logical-flow-diagram)
- [Key Features](#key-features)
  - [1. Interactive Mobile Chat Companion](#1-interactive-mobile-chat-companion)
  - [2. Physical MCP Actuator Node](#2-physical-mcp-actuator-node)
  - [3. Native Alarm & Reminder Engine](#3-native-alarm--reminder-engine)
  - [4. Realistic Simulated Rescue Call System](#4-realistic-simulated-rescue-call-system)
  - [5. Settings, Security & Diagnostics Center](#5-settings-security--diagnostics-center)
- [MCP Tools Specification & Reference](#mcp-tools-specification--reference)
  - [Tool Inventory](#tool-inventory)
  - [JSON-RPC 2.0 Protocol Examples](#json-rpc-20-protocol-examples)
- [Tech Stack & Dependencies](#tech-stack--dependencies)
- [Project Structure](#project-structure)
- [Local Development & Setup](#local-development--setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Metro Bundler](#running-the-metro-bundler)
  - [Running on Android](#running-on-android)
  - [Running on iOS](#running-on-ios)
  - [Type Checking & Testing](#type-checking--testing)
- [Testing with Mock Hermes Server](#testing-with-mock-hermes-server)
  - [Starting the Mock Server](#starting-the-mock-server)
  - [Interactive CLI Commands](#interactive-cli-commands)
  - [HTTP Test Endpoints](#http-test-endpoints)
  - [Natural Language Triggers in Chat](#natural-language-triggers-in-chat)
- [Permissions & Privacy](#permissions--privacy)
- [Author & Credits](#author--credits)
- [License](#license)

---

## System Architecture

Wingman maintains a persistent, full-duplex WebSocket connection to the Hermes AI Server using standard **JSON-RPC 2.0**. Across this single multiplexed connection, two concurrent communication channels operate:

```
┌─────────────────────────────────────────────────────────────────┐
│                           HERMES AI                             │
│               (Personal Assistant Server / Node)                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                   WebSocket / JSON-RPC 2.0
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
┌───────▼───────────────────────┐       ┌───────────────▼───────────────┐
│         Chat Channel          │       │       MCP Tool Channel        │
│  - User Prompt Messages       │       │  - Dynamic Tool Discovery     │
│  - Token-by-Token Streaming   │       │    (tools/list)               │
│  - Voice Memos (AAC)          │       │  - Actuator Execution Calls   │
│  - Quick Action Invocations   │       │    (tools/call)               │
└───────────────┬───────────────┘       └───────────────┬───────────────┘
                │                                       │
                └───────────────────────┬───────────────┘
                                        │
┌───────────────────────────────────────▼─────────────────────────────────┐
│                         WINGMAN MOBILE CLIENT                           │
│                                                                         │
│  ┌─────────────────────────────┐     ┌───────────────────────────────┐  │
│  │     User Interface Layer    │     │       MCP Tool Registry       │  │
│  │  - ChatScreen (Streaming UI)│     │  - Permission Verification    │  │
│  │  - CallScreen (Dialer/TTS)  │     │  - Input Schema Validation    │  │
│  │  - SettingsScreen (Logs)    │     │  - Execution Dispatcher       │  │
│  │  - QuickActionsDrawer       │     │  - Execution Telemetry Logger │  │
│  │  - ToolExecutionBadge       │     └───────────────┬───────────────┘  │
│  └──────────────┬──────────────┘                     │                  │
│                 │                                    │                  │
│  ┌──────────────▼──────────────┐     ┌───────────────▼───────────────┐  │
│  │        Zustand Stores       │     │  Hardware Abstraction (HAL)   │  │
│  │  - useChatStore             │     │  - AlarmReminderModule (Java) │  │
│  │  - useCallStore             │     │  - Torch / Flashlight Strobe  │  │
│  │  - useSettingsStore         │     │  - Haptics & Morse Generator  │  │
│  │  - useReminderStore         │     │  - DeviceInfo & Telemetry     │  │
│  │  - useMcpLogStore           │     │  - Camera Snapshot & Vision   │  │
│  └─────────────────────────────┘     │  - Sound & Ringtone Player    │  │
│                                      │  - Clipboard & Notifications  │  │
│                                      └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Bi-Directional Communication Protocol

1. **Client Handshake**: On connection, Wingman transmits an `initialize` JSON-RPC handshake containing its client metadata (`Wingman Mobile Client v1.0.0`) and declares support for streaming chat and physical MCP actuation.
2. **Dynamic Tool Discovery (`tools/list`)**: Hermes queries the client's available physical MCP tools. Wingman returns its complete schema list (tool names, descriptions, and JSON Schema parameters).
3. **Conversational Stream (`chat/stream_chunk`)**: Hermes streams assistant tokens in real time. Wingman dynamically appends delta chunks, animating the response for a fluid chat experience.
4. **Physical Actuation (`tools/call`)**: When Hermes decides a physical action is necessary (e.g., user says *"Call me to get me out of this meeting"* or *"Wake me up tomorrow at 6:30 AM"*), Hermes dispatches a `tools/call` JSON-RPC request to Wingman.
5. **Execution & Telemetry Result**: Wingman validates user privacy permissions, runs the hardware or native OS routine, and returns a structured JSON-RPC result or error response.

---

## Key Features

### 1. Interactive Mobile Chat Companion
- **Real-Time Token Streaming**: Word-by-word streaming responses rendered with GitHub-flavored Markdown.
- **Inline Tool Execution Badges**: Custom visual chips (`ToolExecutionBadge`) embedded directly in conversation bubbles displaying tool name, execution status (`pending`, `success`, `failed`, `denied`), duration in milliseconds, and expandable argument/result inspection.
- **Voice Memo Recording**: Integrated audio modal with pulsing soundwave animation to capture spoken briefs and send them directly to Hermes for transcription and analysis.
- **Quick Action Drawer**: Horizontal quick-launch bar for instantaneous one-tap commands:
  - 🚨 **Rescue Call**: Immediate request for an urgent incoming call.
  - 🎙️ **Voice Memo**: Quick-open voice recorder.
  - 📸 **Snap & Inspect**: Capture rear/front camera snapshot and send to Hermes vision.
  - 🔦 **Torch Strobe**: Pulse camera flash for visual signaling.
  - 🔋 **Telemetry**: Send instantaneous battery %, charging, and network report.
  - ⏰ **Set Alarm**: Shortcut to program an alarm.
  - 🔔 **Set Reminder**: Shortcut to schedule a reminder.

### 2. Physical MCP Actuator Node
Transforms the smartphone into an IoT actuator for the Hermes assistant:
- **Rear Camera Flashlight / Torch**: Turn on, turn off, or pulse continuous strobe patterns with configurable frequency and duration.
- **Haptic Tactile Engine**: Trigger discrete feedback patterns (`light`, `heavy`, `alert`) or generate real-time vibrational Morse code from arbitrary text strings.
- **Camera Snapshot Frame Feeder**: Capture high-resolution still frames from the front or rear camera lenses and pass base64 image data back to Hermes for computer vision inspection.
- **Device Telemetry Reporting**: Query battery percentage, charging state, WiFi/Cellular connection status, device model, and OS version.
- **Clipboard Management**: Securely read or write text from and to the smartphone clipboard.
- **Native Heads-Up Notifications**: Dispatch rich notifications with custom titles, bodies, and actionable buttons.

### 3. Native Alarm & Reminder Engine
Deeply integrated with native mobile OS intents and schedulers:
- **Real System Clock Alarms**: Uses Android's `AlarmClock.ACTION_SET_ALARM` intent to configure real system alarms directly in the user's default Clock app (Google Clock, Samsung Clock, Motorola Clock, etc.) with 24-hour time, custom labels, vibration toggles, and repeating weekdays.
- **Native System Timers**: Configures real countdown timers in the native Clock app using `AlarmClock.ACTION_SET_TIMER`.
- **System Calendar Integration**: Automatically drafts or schedules calendar entries via Android `CalendarContract.Events` with start/end timestamps, location strings, notes, and all-day flags.
- **Natural Language Time Parsing**: Intelligently handles relative time offsets (`+15m`, `30m`, `2h`, `1d`), standard clock times (`07:30`, `7:30 AM`, `19:45`), or standard ISO-8601 strings.
- **In-App Alarm & Reminder Registry**: Retains an active in-memory scheduler with haptic buzz and notification triggers when deadlines elapse, alongside listing (`list_reminders`) and cancellation (`cancel_reminder`) tools.

### 4. Realistic Simulated Rescue Call System
- **Authentic Dialing Interface**: Full-screen modal overlay replicating native iOS and Android phone dialers.
- **Customizable Caller Identity**: Hermes can simulate calls from any identity (e.g., *"Emergency Dispatch"*, *"Dr. Evelyn Carter"*, *"Work Server Alert"*), accompanied by custom phone numbers and avatars.
- **Audio Feedback**: Looping telephone ringtone and synchronized chassis vibration.
- **Active Call Interface**: When answered, displays call duration timer (`00:14`), interactive mute button, speaker toggle, keypad view, and streams Hermes TTS audio transcript directly through the phone earpiece or speaker.
- **Configurable Auto-Decline**: Rings for a user-specified timeout before hanging up if left unanswered.

### 5. Settings, Security & Diagnostics Center
- **Connection Configuration**: Configure Hermes WebSocket URL (`ws://...` or `wss://...`), Bearer Auth Token / API Key, and auto-reconnect switch.
- **256-Bit Cryptographic Token Security**: Protects WebSocket transport and physical MCP actuators using high-entropy 256-bit authentication tokens (`wm_sec_...`). Includes an automated CLI generator (`npm run generate:token`), in-app token generator, clipboard copy button, visibility toggle, and timing-safe constant-time comparison on the gateway.
- **Granular Hardware Privacy Toggles**: Fine-grained user switches to permit or deny access to camera, flashlight, haptics, simulated calls, notifications, clipboard, and alarms/reminders. Any denied tool call cleanly reports permission rejection to Hermes without crashing.
- **One-Tap Diagnostic Self-Tests**: Test buttons to verify rescue call overlay, haptic vibrations, torch strobe, telemetry query, system clock alarm, calendar reminder, and server ping.
- **Live MCP Execution Inspector**: Live stream of incoming tool calls displaying execution timestamps, status badges, latency in milliseconds, arguments, and full JSON responses.

---

## MCP Tools Specification & Reference

Wingman implements the **Model Context Protocol (MCP)** specification over JSON-RPC 2.0. Hermes queries the mobile node via `tools/list` and executes actuators via `tools/call`.

### Tool Inventory

| Tool Name | Category | Description | Parameters |
|:---|:---:|:---|:---|
| `simulate_call` | `interaction` | Triggers a full-screen realistic incoming call screen with ringtone, vibration, and Hermes TTS playback on answer. | `callerName` *(string, req)*<br>`callerNumber` *(string)*<br>`callerAvatarUrl` *(string)*<br>`ttsScript` *(string)*<br>`autoDeclineTimeoutSec` *(number)* |
| `send_notification` | `interaction` | Dispatches a heads-up native mobile notification with optional interactive action buttons. | `title` *(string, req)*<br>`message` *(string, req)*<br>`actions` *(array of {id, title, style})* |
| `trigger_haptics` | `hardware` | Vibrates the phone chassis. Supports standard tactile patterns or text-encoded Morse code. | `pattern` *('light' \| 'heavy' \| 'alert' \| 'morse', req)*<br>`morseMessage` *(string)* |
| `toggle_flashlight` | `hardware` | Controls the physical rear camera torch / flashlight (on, off, or pulsed strobe). | `mode` *('on' \| 'off' \| 'strobe', req)*<br>`durationSec` *(number)*<br>`strobeIntervalMs` *(number)* |
| `capture_snapshot` | `hardware` | Captures a photo using rear or front lens and returns base64 image data for Hermes vision analysis. | `cameraType` *('back' \| 'front')*<br>`quality` *(number 0.1-1.0)* |
| `get_device_telemetry` | `telemetry` | Returns battery %, charging status, network connection type, OS version, and device model. | *None* |
| `access_clipboard` | `system` | Reads text from or writes text to the mobile device clipboard. | `action` *('read' \| 'write', req)*<br>`text` *(string)* |
| `set_alarm` | `hardware` | Sets a real native system clock alarm in the user's default Clock app. | `hour` *(number 0-23, req)*<br>`minutes` *(number 0-59)*<br>`label` *(string)*<br>`skipUi` *(boolean)*<br>`vibrate` *(boolean)*<br>`days` *(number[]: 1=Sun..7=Sat)* |
| `set_reminder` | `system` | Schedules an in-app reminder notification and/or native Calendar app event. Supports relative offsets (`+15m`, `2h`) and clock times. | `title` *(string, req)*<br>`notes` *(string)*<br>`dueTime` *(string)*<br>`target` *('app_notification' \| 'calendar' \| 'both')*<br>`allDay` *(boolean)*<br>`location` *(string)* |
| `list_reminders` | `system` | Lists all active and scheduled reminders, alarms, and timers currently pending or triggered. | `status` *('pending' \| 'triggered' \| 'all')* |
| `cancel_reminder` | `system` | Cancels a pending reminder or timer by its unique identifier. | `reminderId` *(string, req)* |
| `show_clock` | `system` | Opens the native device Clock application directly to inspect configured alarms or timers. | `view` *('alarms' \| 'timers')* |
| `set_alarm_or_timer` | `system` | Sets a countdown timer or alert alarm with duration, label, and completion alert. | `durationSeconds` *(number, req)*<br>`label` *(string)*<br>`notifyWhenDone` *(boolean)* |

---

### JSON-RPC 2.0 Protocol Examples

#### 1. Discovery (`tools/list`)

**Request from Hermes:**
```json
{
  "jsonrpc": "2.0",
  "id": "req_001",
  "method": "tools/list",
  "params": {}
}
```

**Response from Wingman:**
```json
{
  "jsonrpc": "2.0",
  "id": "req_001",
  "result": {
    "tools": [
      {
        "name": "simulate_call",
        "category": "interaction",
        "description": "Triggers a realistic incoming phone call screen...",
        "inputSchema": {
          "type": "object",
          "properties": {
            "callerName": { "type": "string" },
            "callerNumber": { "type": "string" },
            "ttsScript": { "type": "string" }
          },
          "required": ["callerName"]
        }
      }
    ]
  }
}
```

#### 2. Flashlight Strobe Execution (`tools/call`)

**Request from Hermes:**
```json
{
  "jsonrpc": "2.0",
  "id": "req_002",
  "method": "tools/call",
  "params": {
    "name": "toggle_flashlight",
    "arguments": {
      "mode": "strobe",
      "durationSec": 4,
      "strobeIntervalMs": 120
    }
  }
}
```

**Response from Wingman:**
```json
{
  "jsonrpc": "2.0",
  "id": "req_002",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Flashlight state updated: Strobe active for 4s (period: 120ms)"
      }
    ]
  }
}
```

#### 3. Setting a Native Clock Alarm (`tools/call`)

**Request from Hermes:**
```json
{
  "jsonrpc": "2.0",
  "id": "req_003",
  "method": "tools/call",
  "params": {
    "name": "set_alarm",
    "arguments": {
      "hour": 6,
      "minutes": 45,
      "label": "Morning Flight to SF",
      "vibrate": true,
      "skipUi": false
    }
  }
}
```

**Response from Wingman:**
```json
{
  "jsonrpc": "2.0",
  "id": "req_003",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Alarm scheduled successfully: Alarm set for 06:45 (\"Morning Flight to SF\") (ID: alarm_1731904800000). Native Clock app configured."
      }
    ]
  }
}
```

---

## Tech Stack & Dependencies

| Layer | Technology | Details |
|:---|:---|:---|
| **Core Framework** | React Native `0.76.5` | Native mobile foundation with new architecture compatibility |
| **Tooling & Build** | Expo SDK `^52.0.49` | Managed build environment with native prebuild support |
| **Language** | TypeScript `^5.7.3` | Strict static typing across all modules and schemas |
| **JS Runtime Engine** | Hermes Engine | Optimized bytecode compiler with low memory footprint and fast startup |
| **State Management** | Zustand `^5.0.3` | Lightweight, unopinionated reactive stores with minimal boilerplate |
| **Navigation** | React Navigation `^7.0.14` | Native Stack navigator for fluid 60fps screen transitions |
| **Networking & Protocol** | WebSocket & JSON-RPC 2.0 | Full-duplex persistent client with auto-reconnection and exponential backoff |
| **Haptics** | `react-native-haptic-feedback` | Hardware vibrator modulation with custom Morse pattern engine |
| **Torch / Flashlight** | `react-native-torch` | Direct hardware camera LED control |
| **Device Telemetry** | `react-native-device-info` | Real-time battery, charging, hardware, and OS metrics |
| **Network State** | `@react-native-community/netinfo` | Real-time cellular and Wi-Fi connection monitoring |
| **Camera & Vision** | `react-native-image-picker` | Front and rear lens capture with base64 export |
| **Audio & Sound** | `react-native-sound` | Native ringtone and sound effect playback |
| **Clipboard** | `@react-native-clipboard/clipboard` | Direct OS clipboard read and write access |
| **Testing** | Jest `^29.7.0` & `ts-jest` | 29 comprehensive unit, store, protocol, and E2E integration tests |

---

## Project Structure

```
wingman/
├── __tests__/                      # Jest unit & E2E integration test suites
│   ├── alarm-reminder.test.ts      # Native alarm, timer & calendar service tests
│   ├── e2e-integration.test.ts     # End-to-end WebSocket client & server tests
│   ├── hermes-protocol.test.ts     # JSON-RPC 2.0 encoder/decoder protocol tests
│   ├── mcp-registry.test.ts        # MCP tool registry, permissions & dispatch tests
│   └── stores.test.ts              # Zustand stores state transition tests
├── android/                        # Native Android project configuration
│   └── app/src/main/java/com/wingman/
│       ├── AlarmReminderModule.kt  # Native Kotlin module for AlarmClock & Calendar intents
│       ├── AlarmReminderPackage.kt # React Native package registration
│       ├── MainActivity.kt         # Android main activity entry
│       └── MainApplication.kt      # React Application configuration
├── scripts/
│   └── fix-expo-hmr.js             # Post-install Metro HMR resolution patch
├── src/
│   ├── components/                 # Reusable UI presentation components
│   │   ├── AudioRecordModal.tsx    # Voice memo recorder modal with animated feedback
│   │   ├── ConnectionStatusBanner.tsx # WebSocket status bar (connected, disconnected, retry)
│   │   ├── MessageBubble.tsx       # Markdown message bubble with tool execution chips
│   │   ├── QuickActionsDrawer.tsx  # Horizontal drawer for one-tap hardware triggers
│   │   └── ToolExecutionBadge.tsx  # Expandable visual chip for MCP execution telemetry
│   ├── navigation/
│   │   └── RootNavigator.tsx       # React Navigation Native Stack setup
│   ├── screens/
│   │   ├── CallScreen.tsx          # Realistic incoming / active simulated call dialer
│   │   ├── ChatScreen.tsx          # Real-time streaming conversation view & action drawer
│   │   └── SettingsScreen.tsx      # Device control center, permission toggles & live logs
│   ├── services/
│   │   ├── hermes/
│   │   │   ├── client.ts           # Dual-channel WebSocket client with auto-reconnect
│   │   │   └── protocol.ts         # JSON-RPC 2.0 message builder, validator & parser
│   │   └── mcp/
│   │       ├── hardware/           # Hardware Abstraction Layer (HAL) with safe mock fallbacks
│   │       │   ├── nativeAlarmReminder.ts # Alarms, timers & calendar intent wrappers
│   │       │   ├── nativeCamera.ts        # Camera snapshot capture service
│   │       │   ├── nativeClipboard.ts     # System clipboard service
│   │       │   ├── nativeDeviceInfo.ts    # Battery & telemetry service
│   │       │   ├── nativeHaptics.ts       # Haptic feedback & Morse code generator
│   │       │   ├── nativeNotification.ts  # Native notification service
│   │       │   ├── nativeSound.ts         # Ringtone & audio playback service
│   │       │   └── nativeTorch.ts         # Camera LED torch & strobe controller
│   │       ├── registry.ts         # MCP Tool Registry, permissions check & dispatcher
│   │       └── schema.ts           # MCP tool definitions & JSON Schema specifications
│   ├── store/                      # Reactive Zustand state stores
│   │   ├── useCallStore.ts         # Simulated call states, audio timers & TTS playback
│   │   ├── useChatStore.ts         # Chat message history, streaming tokens & status
│   │   ├── useMcpLogStore.ts       # Live telemetry logs of incoming MCP tool calls
│   │   ├── useReminderStore.ts     # Scheduled alarms, timers, and reminder registry
│   │   └── useSettingsStore.ts     # Server connection profiles & hardware permission flags
│   └── types/                      # TypeScript interface declarations
│       ├── call.ts                 # Call state & call payload interfaces
│       ├── chat.ts                 # Chat message & streaming chunk interfaces
│       ├── hermes.ts               # JSON-RPC 2.0 protocol interfaces
│       ├── mcp.ts                  # Model Context Protocol specifications
│       ├── reminder.ts             # Alarm, timer & reminder model interfaces
│       └── settings.ts             # Connection settings & permission interfaces
├── App.tsx                         # Top-level React application root component
├── app.json                        # Expo project configuration
├── babel.config.js                 # Babel preset configuration
├── index.js                        # React Native entry point registration
├── jest.config.js                  # Jest test runner configuration
├── jest.setup.js                   # Hardware mock environment setup for Jest
├── metro.config.js                 # Metro bundler configuration with custom resolver
├── package.json                    # Project metadata, dependencies & scripts
├── test-hermes-server.js           # Built-in Mock Hermes AI WebSocket server & CLI
└── tsconfig.json                   # Strict TypeScript compiler configuration
```

---

## Local Development & Setup

### Prerequisites

- **Node.js**: Version 18.x or higher (`node -v`)
- **Package Manager**: `npm` (v9+) or `pnpm` (v9+)
- **Android Development**: Android Studio, Android SDK (API level 34+), and an Android Virtual Device (AVD) or physical Android device with USB debugging enabled.
- **iOS Development (macOS only)**: Xcode 15+, CocoaPods, and iOS Simulator.

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/NIRONMAN/wingman.git
cd wingman

# Install dependencies
npm install
# or
pnpm install
```

> **Note**: The `postinstall` script (`scripts/fix-expo-hmr.js`) automatically configures Metro's Hot Module Replacement client path for seamless Expo development.

### Running the Metro Bundler

Start the Metro development server:

```bash
npm start
# or
pnpm start
```

### Running on Android

To launch the app on an active Android emulator or connected physical device:

```bash
npm run android
# or
pnpm android
```

### Running on iOS

*(macOS required)*

```bash
npm run ios
# or
pnpm ios
```

### Type Checking & Testing

Run strict TypeScript verification without emitting output:

```bash
npm run typecheck
```

Execute the full Jest test suite (29 tests across stores, protocols, and hardware mock layers):

```bash
npm test
```

Generate test coverage reports:

```bash
npm run test:coverage
```

### Secure Token Generation & Gateway Pairing

Wingman secures all WebSocket channels and physical MCP actuator invocations with 256-bit cryptographic bearer tokens.

1. **Generate a Secure 256-bit Token**:
   ```bash
   # Prints a freshly minted token with configuration instructions
   npm run generate:token

   # Or generate and automatically write it to your .env file
   npm run generate:token -- --write-env
   ```

2. **Configure Hermes Gateway (`.env`)**:
   ```env
   PORT=8765
   HERMES_BIN=/home/u0_a205/.local/bin/hermes
   WINGMAN_AUTH_TOKEN=wm_sec_73b3c1d01137a28577233166e4c2e7c469a56989345020df78f959cf9d25604d
   HERMES_GATEWAY_TOKEN=wm_sec_73b3c1d01137a28577233166e4c2e7c469a56989345020df78f959cf9d25604d
   ```

3. **In the Wingman Mobile App**:
   - Open **Settings**.
   - Paste the token into **Auth Bearer Token** (or tap **🎲 Generate Token** and use **📋 Copy Token**).
   - Tap **Save & Reconnect**.

---

---

## Testing with Mock Hermes Server

Wingman includes an interactive Node.js mock Hermes server (`test-hermes-server.js`). It simulates Hermes AI, supports token streaming, processes natural language intents, and allows manual dispatch of physical MCP tool calls directly to connected phones.

### Starting the Mock Server

In a separate terminal window, run:

```bash
npm run mock-server
```

The server initializes on port `8765`:
- **WebSocket URL**: `ws://localhost:8765` (or `ws://10.0.2.2:8765` from an Android emulator)
- **HTTP Health Check**: `http://localhost:8765/health`

### Interactive CLI Commands

Once the server is running and a Wingman client connects, use the interactive terminal console to actuate physical phone hardware:

| Command | Action |
|:---|:---|
| `call` | Dispatches `simulate_call` to ring all connected phones with realistic UI and audio. |
| `torch` | Dispatches `toggle_flashlight` to trigger a 4-second strobe on the phone's LED. |
| `haptic` | Dispatches `trigger_haptics` with an alert vibration pattern. |
| `tools` | Queries the connected phone for its available physical tools via `tools/list`. |
| `msg <text>` | Streams a custom message to the phone with simulated typing latency. |
| `quit` | Gracefully shuts down the mock server. |

### HTTP Test Endpoints

Trigger MCP actions externally using `curl`:

```bash
# Trigger an urgent simulated rescue call
curl -X POST http://localhost:8765/trigger-call \
  -H "Content-Type: application/json" \
  -d '{"callerName": "Doctor Office", "callerNumber": "+1 (555) 019-2834"}'

# Trigger flashlight strobe
curl -X POST http://localhost:8765/trigger-torch

# Trigger haptic alert
curl -X POST http://localhost:8765/trigger-haptic

# Check server status and connected clients
curl http://localhost:8765/health
```

### Natural Language Triggers in Chat

You can test physical actuation by simply chatting inside the Wingman app:

- Type `"/rescue"` or *"Can you call my phone right now?"* ➡️ Hermes dispatches `simulate_call`.
- Type `"/torch"` or *"Turn on my flashlight"* ➡️ Hermes dispatches `toggle_flashlight`.
- Type `"/haptic"` or *"Give me a buzz"* ➡️ Hermes dispatches `trigger_haptics`.
- Type `"/telemetry"` or *"Check my battery"* ➡️ Hermes reads device telemetry and replies with analysis.
- Press **Snap & Inspect** in the Quick Actions Drawer ➡️ Captures a camera frame and attaches it to chat.

---

## Permissions & Privacy

Wingman is designed with user privacy as a first-class priority. The app provides granular permission switches in the **Settings** screen:

| Permission Switch | Controlled Hardware / OS Capabilities |
|:---|:---|
| `allowSimulatedCalls` | Realistic incoming call screen and audio playback |
| `allowFlashlight` | Camera torch and strobe activation |
| `allowHaptics` | Phone vibration and Morse code engine |
| `allowCamera` | Frame snapshots via front or rear lenses |
| `allowNotifications` | Heads-up system notifications |
| `allowClipboard` | Reading or writing clipboard strings |
| `allowAlarmsAndReminders` | Setting system Clock alarms, timers, and Calendar events |

If a permission is disabled, any incoming `tools/call` for that capability is rejected immediately with a clean `Permission denied` error returned to Hermes, preventing unauthorized physical actuation.

---

## Author & Credits

**Niranjan Dabhade**
- GitHub: [@NIRONMAN](https://github.com/NIRONMAN)
- Website: [nironman.com](https://nironman.com)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
