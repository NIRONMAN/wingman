/**
 * Mock Hermes AI Server & MCP Controller
 * Demonstrates bi-directional communication with the Wingman mobile app:
 * - Streaming chat responses
 * - Exposing and dispatching MCP physical tool requests (calls, flashlight, haptics, telemetry)
 * - Interactive terminal console + HTTP trigger endpoints
 */

const http = require('http');
const { WebSocketServer } = require('ws');
const readline = require('readline');

const PORT = process.env.PORT || 8765;

// Create HTTP server
const server = http.createServer((req, res) => {
  // Simple HTTP triggers for testing
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health' || url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      connectedClients: activeClients.size,
      uptimeSeconds: process.uptime(),
    }));
    return;
  }

  if (url.pathname === '/trigger-call' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let params = {};
      try { params = JSON.parse(body || '{}'); } catch {}
      const results = await triggerAllClientsTool('simulate_call', {
        callerName: params.callerName || 'Hermes Priority Dispatch',
        callerNumber: params.callerNumber || '+1 (800) 437-6371',
        ttsScript: params.ttsScript || 'This is Hermes verifying your mobile node voice link.',
        autoDeclineTimeoutSec: params.timeout || 30,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, dispatchedTo: results.length, results }));
    });
    return;
  }

  if (url.pathname === '/trigger-torch' && req.method === 'POST') {
    triggerAllClientsTool('toggle_flashlight', { mode: 'strobe', durationSec: 3, strobeIntervalMs: 120 });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Flashlight strobe dispatched' }));
    return;
  }

  if (url.pathname === '/trigger-haptic' && req.method === 'POST') {
    triggerAllClientsTool('trigger_haptics', { pattern: 'alert' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Haptic alert dispatched' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Hermes Mock Server active. Connect via WebSocket on ws://localhost:' + PORT);
});

// WebSocket Server
const wss = new WebSocketServer({ server });
const activeClients = new Set();
let requestIdCounter = 1;

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`\n🟢 [Hermes] New Wingman client connected from ${clientIp}`);
  activeClients.add(ws);

  ws.pendingRequests = new Map();

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      await handleClientMessage(ws, msg);
    } catch (err) {
      console.error('❌ [Hermes] Error parsing client message:', err.message);
    }
  });

  ws.on('close', () => {
    console.log(`🔴 [Hermes] Wingman client disconnected (${clientIp})`);
    activeClients.delete(ws);
  });
});

async function handleClientMessage(ws, msg) {
  // 1. JSON-RPC Response to a server-initiated request (like tools/call)
  if (msg.id && !msg.method) {
    if (ws.pendingRequests.has(msg.id)) {
      const { resolve, reject } = ws.pendingRequests.get(msg.id);
      ws.pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
    return;
  }

  // 2. Handshake / Initialize
  if (msg.method === 'initialize') {
    console.log(`🤝 [Hermes] Handshake received from client:`, msg.params?.clientInfo?.name);
    const response = {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        serverInfo: {
          name: 'Hermes Assistant Engine (Mock)',
          version: '2.4.0',
        },
        capabilities: {
          chat: { streaming: true },
          mcpConsumer: true,
        },
      },
    };
    ws.send(JSON.stringify(response));

    // Request tool inventory from phone
    setTimeout(async () => {
      try {
        console.log('📋 [Hermes] Querying client physical MCP tools inventory (tools/list)...');
        const toolsList = await callClientTool(ws, 'tools/list', {});
        console.log(`✅ [Hermes] Phone reported ${toolsList?.tools?.length || 0} physical tools:`,
          toolsList?.tools?.map(t => t.name).join(', ')
        );
      } catch (e) {
        console.log('⚠️ [Hermes] Could not retrieve tools list:', e.message);
      }
    }, 500);

    return;
  }

  // 3. Ping
  if (msg.method === 'ping') {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: msg.id,
      result: { pong: true, serverTime: Date.now() },
    }));
    return;
  }

  // 4. Chat Message from user
  if (msg.method === 'chat/send') {
    const text = msg.params?.text || '';
    const voiceMemo = msg.params?.voiceMemo;
    console.log(`\n💬 [User -> Hermes]: "${text}"${voiceMemo ? ` (Voice memo: ${voiceMemo.durationSec}s)` : ''}`);

    // Acknowledge receipt of the chat/send request
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: msg.id,
      result: { status: 'received' },
    }));

    // Process user intent & dispatch response / MCP tools
    await processUserIntent(ws, text, voiceMemo);
  }
}

async function processUserIntent(ws, text, voiceMemo) {
  const lower = text.toLowerCase();
  const messageId = `hermes_${Date.now()}`;

  // Intent 1: Rescue Call
  if (lower.includes('/rescue') || lower.includes('rescue call') || lower.includes('call my phone') || lower.includes('call me')) {
    await streamReply(ws, messageId, "Understood. I am dispatching a simulated incoming priority call to your phone right now. Answer to hear the briefing.");

    setTimeout(async () => {
      console.log('⚡ [Hermes] Dispatching simulate_call MCP tool to phone...');
      try {
        const result = await callClientTool(ws, 'tools/call', {
          name: 'simulate_call',
          arguments: {
            callerName: 'Urgent Office Dispatch',
            callerNumber: '+1 (555) 019-8472',
            ttsScript: 'Excuse me, there is an urgent production update that requires your immediate attention. Please step aside to review.',
            autoDeclineTimeoutSec: 25,
          },
        });
        console.log('✅ [Hermes] simulate_call executed on phone:', JSON.stringify(result));
      } catch (err) {
        console.error('❌ [Hermes] Failed to execute simulate_call:', err.message);
      }
    }, 800);
    return;
  }

  // Intent 2: Flashlight / Torch
  if (lower.includes('/torch') || lower.includes('flashlight') || lower.includes('torch')) {
    await streamReply(ws, messageId, "Actuating device hardware: Flashlight strobe activated for 4 seconds.");

    setTimeout(async () => {
      console.log('⚡ [Hermes] Dispatching toggle_flashlight MCP tool...');
      await callClientTool(ws, 'tools/call', {
        name: 'toggle_flashlight',
        arguments: {
          mode: 'strobe',
          durationSec: 4,
          strobeIntervalMs: 120,
        },
      });
    }, 500);
    return;
  }

  // Intent 3: Haptic Feedback / Morse
  if (lower.includes('/haptic') || lower.includes('vibrate') || lower.includes('buzz')) {
    await streamReply(ws, messageId, "Tactile feedback dispatched to phone chassis.");
    setTimeout(async () => {
      console.log('⚡ [Hermes] Dispatching trigger_haptics MCP tool...');
      await callClientTool(ws, 'tools/call', {
        name: 'trigger_haptics',
        arguments: { pattern: 'alert' },
      });
    }, 400);
    return;
  }

  // Intent 4: Telemetry / Battery
  if (lower.includes('/telemetry') || lower.includes('battery') || lower.includes('device state') || lower.includes('phone state')) {
    await streamReply(ws, messageId, "Querying live physical telemetry from your phone...");

    try {
      const toolRes = await callClientTool(ws, 'tools/call', {
        name: 'get_device_telemetry',
        arguments: {},
      });
      const dataStr = toolRes?.content?.find(c => c.type === 'text')?.text || '{}';
      const telemetry = JSON.parse(dataStr);

      const followupId = `telemetry_eval_${Date.now()}`;
      await streamReply(
        ws,
        followupId,
        `📊 **Device Telemetry Analysis**:\n- **Battery**: ${telemetry.batteryLevel}% (${telemetry.isCharging ? 'Charging ⚡' : 'Discharging'})\n- **Network**: ${telemetry.networkType.toUpperCase()} (Online: ${telemetry.isConnected ? 'Yes' : 'No'})\n- **Device**: ${telemetry.deviceModel} running ${telemetry.systemName} ${telemetry.systemVersion}\n\nYour hardware node is healthy and responsive.`
      );
    } catch (e) {
      console.error('❌ Telemetry query error:', e.message);
    }
    return;
  }

  // Intent 5: Snapshot / Vision
  if (lower.includes('snapshot') || lower.includes('camera') || lower.includes('inspect')) {
    await streamReply(
      ws,
      messageId,
      "I have received your visual inspection request. The snapshot frame shows your environment. All visual metrics look clear."
    );
    return;
  }

  // Intent 6: Voice Memo Follow-up
  if (voiceMemo) {
    await streamReply(
      ws,
      messageId,
      `🎙️ Received your ${voiceMemo.durationSec}s voice memo. Audio processed and transcribed accurately. How would you like me to proceed?`
    );
    return;
  }

  // Default Chat Streaming
  const defaultReply = `I received your message: "${text}". As your physical Wingman node, I can actuate phone hardware anytime. Try typing **/rescue** for a call, **/torch** for the flashlight, or check the Quick Actions drawer below.`;
  await streamReply(ws, messageId, defaultReply);
}

// Stream text to client chunk by chunk
async function streamReply(ws, messageId, fullText) {
  const words = fullText.split(' ');
  let accumulated = '';

  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    accumulated += chunk;
    const isComplete = i === words.length - 1;

    const streamNotification = {
      jsonrpc: '2.0',
      method: 'chat/stream_chunk',
      params: {
        messageId,
        delta: chunk,
        isComplete,
      },
    };

    if (ws.readyState === 1) {
      ws.send(JSON.stringify(streamNotification));
    }

    // Small delay to simulate realistic streaming
    await new Promise(r => setTimeout(r, 40));
  }
}

// Call a tool on a connected client via JSON-RPC
function callClientTool(ws, method, params) {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== 1) {
      return reject(new Error('WebSocket is not open'));
    }

    const id = `hermes_req_${requestIdCounter++}`;
    ws.pendingRequests.set(id, { resolve, reject });

    const req = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    ws.send(JSON.stringify(req));

    // Timeout after 15s
    setTimeout(() => {
      if (ws.pendingRequests.has(id)) {
        ws.pendingRequests.delete(id);
        reject(new Error('Client tool execution timed out'));
      }
    }, 15000);
  });
}

function triggerAllClientsTool(toolName, args) {
  const promises = [];
  for (const client of activeClients) {
    promises.push(
      callClientTool(client, 'tools/call', {
        name: toolName,
        arguments: args,
      }).catch(err => ({ error: err.message }))
    );
  }
  return Promise.all(promises);
}

// Start server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🤖 HERMES MOCK SERVER RUNNING on port ${PORT}`);
  console.log(`   WebSocket URL : ws://localhost:${PORT}`);
  console.log(`   HTTP Health   : http://localhost:${PORT}/health`);
  console.log(`=======================================================`);
  console.log(`Commands available in this console:`);
  console.log(`  call     - Trigger simulated rescue call on connected phone`);
  console.log(`  torch    - Trigger flashlight strobe`);
  console.log(`  haptic   - Trigger alert vibration`);
  console.log(`  tools    - Query client tools list`);
  console.log(`  msg <t>  - Send chat message to phone`);
  console.log(`  quit     - Exit server`);
  console.log(`=======================================================\n`);

  setupCli();
});

function setupCli() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed === 'quit' || trimmed === 'exit') {
      console.log('Shutting down server...');
      process.exit(0);
    }

    if (activeClients.size === 0) {
      console.log('⚠️ No Wingman phone clients currently connected.');
      return;
    }

    if (trimmed === 'call') {
      console.log('📞 Dispatching simulated rescue call to all clients...');
      await triggerAllClientsTool('simulate_call', {
        callerName: 'Hermes AI HQ',
        callerNumber: '+1 (800) HERMES-AI',
        ttsScript: 'Urgent reminder: Simulated voice channel test verified successfully.',
        autoDeclineTimeoutSec: 20,
      });
      return;
    }

    if (trimmed === 'torch') {
      console.log('🔦 Dispatching flashlight strobe...');
      await triggerAllClientsTool('toggle_flashlight', {
        mode: 'strobe',
        durationSec: 4,
        strobeIntervalMs: 150,
      });
      return;
    }

    if (trimmed === 'haptic') {
      console.log('📳 Dispatching haptic alert...');
      await triggerAllClientsTool('trigger_haptics', { pattern: 'alert' });
      return;
    }

    if (trimmed === 'tools') {
      console.log('📋 Querying tools on first connected client...');
      const first = activeClients.values().next().value;
      if (first) {
        const res = await callClientTool(first, 'tools/list', {});
        console.log(JSON.stringify(res, null, 2));
      }
      return;
    }

    if (trimmed.startsWith('msg ')) {
      const text = trimmed.substring(4);
      console.log(`💬 Streaming message to clients: "${text}"`);
      for (const client of activeClients) {
        streamReply(client, `cli_${Date.now()}`, text);
      }
      return;
    }

    console.log(`Unknown command: "${trimmed}". Available: call, torch, haptic, tools, msg <text>, quit`);
  });
}
