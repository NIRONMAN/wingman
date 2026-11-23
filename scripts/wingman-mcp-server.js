#!/usr/bin/env node
/**
 * Stdio MCP Server for Hermes on friday
 * Bridges Hermes tool calling directly to the connected Wingman mobile app.
 */

const http = require('http');
const readline = require('readline');

const GATEWAY_PORT = parseInt(process.env.WINGMAN_GATEWAY_PORT || '8765', 10);

const MCP_TOOLS = [
  {
    name: 'simulate_call',
    description: 'Initiate a realistic simulated phone call to the user on their physical mobile device for HIGH-URGENCY or CRITICAL situations. Plays incoming ringtone with full-screen calling UI and speaks ttsScript aloud upon answering.',
    inputSchema: {
      type: 'object',
      properties: {
        callerName: { type: 'string', description: 'Name displayed on incoming call screen (default: Hermes AI)' },
        callerNumber: { type: 'string', description: 'Phone number string displayed (default: +1 (800) HERMES-AI)' },
        ttsScript: { type: 'string', description: 'Spoken message brief played via TTS audio when the user answers' },
        autoDeclineTimeoutSec: { type: 'number', description: 'Seconds before call stops ringing (default: 30)' }
      },
      required: ['ttsScript']
    }
  },
  {
    name: 'send_notification',
    description: 'Deliver a native heads-up push notification to the user\'s physical mobile phone for MODERATE URGENCY updates, reminders, or task alerts.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification body message' }
      },
      required: ['title', 'message']
    }
  },
  {
    name: 'toggle_flashlight',
    description: 'Actuate the physical hardware camera flash / flashlight LED on the user\'s phone. Can switch on, off, or strobe.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['on', 'off', 'strobe'], description: 'Torch mode' },
        durationSec: { type: 'number', description: 'Auto-off timeout in seconds (e.g. 2 for a brief flash)' },
        strobeIntervalMs: { type: 'number', description: 'Strobe frequency interval in milliseconds (default: 120)' }
      },
      required: ['mode']
    }
  },
  {
    name: 'set_alarm',
    description: 'Set a native alarm in the Clock app on the user\'s mobile phone.',
    inputSchema: {
      type: 'object',
      properties: {
        hour: { type: 'number', description: 'Hour of day (0-23)' },
        minutes: { type: 'number', description: 'Minute of hour (0-59)' },
        label: { type: 'string', description: 'Alarm label / message' }
      },
      required: ['hour', 'minutes']
    }
  },
  {
    name: 'capture_snapshot',
    description: 'Capture a camera photo using the user\'s phone camera (back or front). Returns image details and dimensions.',
    inputSchema: {
      type: 'object',
      properties: {
        cameraType: { type: 'string', enum: ['back', 'front'], description: 'Which camera to use (default: back)' },
        quality: { type: 'number', description: 'JPEG quality from 0.1 to 1.0 (default: 0.8)' }
      }
    }
  },
  {
    name: 'get_device_telemetry',
    description: 'Query physical telemetry from the user\'s phone, including battery level percentage, charging status, network connection type, and OS version.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

function callGateway(tool, args) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ tool, args });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: GATEWAY_PORT,
        path: '/api/mcp/call',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 20000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch {
            resolve({ content: [{ type: 'text', text: body }] });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        isError: true,
        content: [{ type: 'text', text: `Failed to communicate with Wingman gateway: ${err.message}` }],
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        isError: true,
        content: [{ type: 'text', text: 'Wingman tool execution timed out on mobile device' }],
      });
    });

    req.write(postData);
    req.end();
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const msg = JSON.parse(trimmed);
    const { id, method, params } = msg;

    if (method === 'initialize') {
      const resp = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'wingman-phone-mcp', version: '1.0.0' },
        },
      };
      process.stdout.write(JSON.stringify(resp) + '\n');
      return;
    }

    if (method === 'tools/list') {
      const resp = {
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      };
      process.stdout.write(JSON.stringify(resp) + '\n');
      return;
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const result = await callGateway(toolName, toolArgs);

      const resp = {
        jsonrpc: '2.0',
        id,
        result,
      };
      process.stdout.write(JSON.stringify(resp) + '\n');
      return;
    }

    if (method === 'notifications/initialized' || method === 'ping') {
      if (id !== undefined) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: {} }) + '\n');
      }
      return;
    }

    // Default response for unhandled requests
    if (id !== undefined) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        }) + '\n'
      );
    }
  } catch (err) {
    // Ignore invalid JSON lines
  }
});
