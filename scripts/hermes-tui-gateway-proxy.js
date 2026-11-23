/**
 * Hermes TUI Gateway Proxy / Middleman Server
 * 
 * Bridges external client connections (such as the Wingman mobile app or emulator)
 * to the local Hermes Gateway via the official TUI Gateway JSON-RPC protocol (hermes-gateway-v1).
 *
 * Features:
 * - Token-based authentication via URL query param (?token=...), Authorization header,
 *   or custom x-auth-token / x-hermes-token headers
 * - WebSocket relay between Wingman client and local Hermes Gateway
 * - Dynamic single-use ticket minting via `hermes gateway attach --json --start`
 * - HTTP health & authenticated status endpoint (/health, /status)
 * - Auto-reconnection & offline queueing
 * - Automatic canonical submission_id injection for prompt.submit
 * - Support for server-initiated tools/call (physical MCP execution on phone)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer, WebSocket: WsClient } = require('ws');
const { execSync, exec } = require('child_process');

// Auto-load .env file if present
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
  ];
  for (const envFile of envPaths) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.substring(0, idx).trim();
            let val = trimmed.substring(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (!process.env[key]) process.env[key] = val;
          }
        }
        break;
      } catch {}
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '8765', 10);

// Resolve Hermes binary
function resolveHermesBin() {
  if (process.env.HERMES_BIN && fs.existsSync(process.env.HERMES_BIN)) {
    return process.env.HERMES_BIN;
  }
  const candidates = [
    path.join(os.homedir(), '.local/bin/hermes'),
    '/home/niro/.local/bin/hermes',
    '/home/u0_a205/.local/bin/hermes',
    '/usr/local/bin/hermes',
    '/usr/bin/hermes',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'hermes';
}

const HERMES_BIN = resolveHermesBin();

// Extract allowed authentication tokens
const rawTokens = [
  process.env.HERMES_GATEWAY_TOKEN,
  process.env.WINGMAN_AUTH_TOKEN,
  process.env.AUTH_TOKEN,
].filter(Boolean);

const validTokens = new Set();
for (const raw of rawTokens) {
  for (const t of raw.split(/[\s,]+/)) {
    const trimmed = t.trim();
    if (trimmed) validTokens.add(trimmed);
  }
}

// Native WebSocket in Node 21+ or fallback to ws package
const SocketClient = typeof global.WebSocket !== 'undefined' ? global.WebSocket : WsClient;

/**
 * Extract auth token from HTTP request or WebSocket handshake request
 */
function extractAuthToken(req) {
  // 1. URL search param (?token=... or ?authToken=... or ?auth_token=...)
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryToken = url.searchParams.get('token') ||
                       url.searchParams.get('authToken') ||
                       url.searchParams.get('auth_token');
    if (queryToken) return queryToken.trim();
  } catch (err) {
    // ignore
  }

  // 2. Authorization header (Bearer <token> or <token>)
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return (match ? match[1] : authHeader).trim();
  }

  // 3. Custom headers
  if (req.headers['x-auth-token']) {
    return String(req.headers['x-auth-token']).trim();
  }
  if (req.headers['x-hermes-token']) {
    return String(req.headers['x-hermes-token']).trim();
  }

  // 4. Sec-WebSocket-Protocol (e.g. token.<token>)
  const protocols = req.headers['sec-websocket-protocol'];
  if (protocols) {
    const parts = protocols.split(',').map(p => p.trim());
    for (const part of parts) {
      if (part.startsWith('token.')) {
        return part.substring(6).trim();
      }
    }
  }

  return null;
}

/**
 * Verify whether the incoming request is authorized
 * Uses timing-safe constant-time comparison to prevent timing attacks
 */
function isAuthorized(req) {
  if (validTokens.size === 0) return true; // Auth disabled if no token is configured
  const clientToken = extractAuthToken(req);
  if (!clientToken) return false;

  try {
    const clientBuf = Buffer.from(clientToken);
    for (const expected of validTokens) {
      const expectedBuf = Buffer.from(expected);
      if (clientBuf.length === expectedBuf.length && crypto.timingSafeEqual(clientBuf, expectedBuf)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// HTTP Server
const server = http.createServer((req, res) => {
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Public health check endpoint for Cloudflare Tunnel / monitoring / checks
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      status: 'online',
      protocol: 'tui_gateway_jsonrpc',
      host: os.hostname(),
      port: PORT,
      authRequired: validTokens.size > 0,
      activeClients: clientConnections.size,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Authenticated status endpoint
  if (url.pathname === '/status') {
    if (!isAuthorized(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: 'Valid token required via ?token= query parameter or Authorization header',
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      status: 'online',
      protocol: 'tui_gateway_jsonrpc',
      host: os.hostname(),
      port: PORT,
      hermesBin: HERMES_BIN,
      authRequired: validTokens.size > 0,
      activeClients: clientConnections.size,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // MCP tool call dispatch endpoint for Hermes / CLI
  if (url.pathname === '/api/mcp/call' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { tool, args } = payload;

        const activeClients = Array.from(clientConnections).filter((ws) => ws.readyState === 1);
        const activeClient = activeClients[activeClients.length - 1];

        if (!activeClient) {
          res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ isError: true, content: [{ type: 'text', text: 'No Wingman mobile device currently connected' }] }));
          return;
        }

        const callId = `mcp_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const reqMsg = {
          jsonrpc: '2.0',
          id: callId,
          method: 'tools/call',
          params: {
            name: tool,
            arguments: args || {},
          },
        };

        const timeout = setTimeout(() => {
          pendingMcpCalls.delete(callId);
          res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ isError: true, content: [{ type: 'text', text: 'Tool execution timed out on mobile device' }] }));
        }, 15000);

        pendingMcpCalls.set(callId, (resMsg) => {
          clearTimeout(timeout);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(resMsg));
        });

        activeClient.send(JSON.stringify(reqMsg));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ isError: true, content: [{ type: 'text', text: err.message }] }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found. Connect via WebSocket on ws://<host>:' + PORT }));
});

// WebSocket Server
const wss = new WebSocketServer({ server });
const clientConnections = new Set();
const pendingMcpCalls = new Map();
let connectionCounter = 1;

/**
 * Mint a fresh connection ticket from Hermes Gateway
 */
function getHermesAttachInfo() {
  return new Promise((resolve, reject) => {
    exec(`"${HERMES_BIN}" gateway attach --json --start`, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`Failed to attach to Hermes gateway: ${stderr || err.message}`));
      }
      try {
        const info = JSON.parse(stdout.trim());
        resolve(info);
      } catch (parseErr) {
        reject(new Error(`Failed to parse Hermes attach info: ${parseErr.message} (output: ${stdout})`));
      }
    });
  });
}

wss.on('connection', async (clientWs, req) => {
  const connId = connectionCounter++;
  const clientIp = req.socket.remoteAddress;

  // Validate Token Authentication
  if (!isAuthorized(req)) {
    console.warn(`🛑 [Proxy #${connId}] Unauthorized connection attempt from ${clientIp} (${req.url})`);
    try {
      clientWs.send(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: 4401,
          message: 'Unauthorized: Missing or invalid authentication token. Pass token via ?token=<TOKEN> or Authorization header.',
        },
        id: null,
      }));
    } catch {}

    setTimeout(() => {
      try {
        clientWs.close(4401, 'Unauthorized');
      } catch {}
    }, 50);
    return;
  }

  console.log(`\n🟢 [Proxy #${connId}] Authenticated Wingman client connected from ${clientIp}`);

  clientConnections.add(clientWs);

  let hermesWs = null;
  const clientQueue = [];
  let isClosing = false;

  // Cleanup helper
  const cleanup = () => {
    if (isClosing) return;
    isClosing = true;
    clientConnections.delete(clientWs);
    if (hermesWs) {
      try { hermesWs.close(); } catch {}
      hermesWs = null;
    }
    console.log(`🔴 [Proxy #${connId}] Connection closed (${clientIp})`);
  };

  clientWs.on('close', cleanup);
  clientWs.on('error', (err) => {
    console.error(`⚠️ [Proxy #${connId}] Client socket error:`, err.message);
    cleanup();
  });

  // Client messages
  clientWs.on('message', (data) => {
    const raw = data.toString();
    try {
      const msg = JSON.parse(raw);

      // Handle response to tools/call from mobile device
      if (msg.id && pendingMcpCalls.has(msg.id)) {
        const callback = pendingMcpCalls.get(msg.id);
        pendingMcpCalls.delete(msg.id);
        callback(msg.result || msg.error || msg);
        return;
      }

      // Handle legacy ping directly if needed
      if (msg.method === 'ping') {
        const pong = {
          jsonrpc: '2.0',
          id: msg.id,
          result: { pong: true, timestamp: Date.now(), gateway: 'tui_gateway_proxy' },
        };
        clientWs.send(JSON.stringify(pong));
        // Keep Hermes alive with gateway.ping if connected
        if (hermesWs && hermesWs.readyState === 1) {
          hermesWs.send(JSON.stringify({ jsonrpc: '2.0', id: `hb_${Date.now()}`, method: 'gateway.ping' }));
        }
        return;
      }

      // Ensure prompt.submit carries a submission_id (required by canonical gateway contract)
      if (msg.method === 'prompt.submit' && msg.params) {
        if (!msg.params.submission_id && !msg.params.input_id) {
          msg.params.submission_id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        }

        if (msg.params.imageBase64) {
          try {
            const imgBuf = Buffer.from(msg.params.imageBase64, 'base64');
            const imgPath = `/tmp/wingman_snapshot_${Date.now()}.jpg`;
            fs.writeFileSync(imgPath, imgBuf);
            console.log(`📸 [Proxy #${connId}] Saved incoming image snapshot to ${imgPath} (${imgBuf.length} bytes)`);
            msg.params.text = (msg.params.text || '') + `\n\n[Live Camera Snapshot Saved to ${imgPath} (${imgBuf.length} bytes)]\nYou can inspect this image file to see what was captured.`;
            delete msg.params.imageBase64;
            delete msg.params.imageMimeType;
          } catch (imgErr) {
            console.error(`⚠️ [Proxy #${connId}] Failed to save snapshot image:`, imgErr.message);
          }
        }

        if (msg.params.text && !msg.params.text.includes('[Wingman Companion Active]')) {
          msg.params.text += `\n\n[Wingman Companion Active: You have access to physical tools on the user's connected phone via MCP: toggle_flashlight, simulate_call (HIGH URGENCY/CRITICAL voice calls), send_notification (MODERATE URGENCY heads-up notifications), set_alarm (Clock app), capture_snapshot, get_device_telemetry]`;
        }
      }

      // If Hermes WS is open, forward immediately
      if (hermesWs && hermesWs.readyState === 1) {
        hermesWs.send(JSON.stringify(msg));
      } else {
        // Queue until Hermes WS connects
        clientQueue.push(JSON.stringify(msg));
      }
    } catch (err) {
      console.error(`⚠️ [Proxy #${connId}] Error handling client frame:`, err.message);
    }
  });

  // Connect to Hermes Gateway backend
  try {
    console.log(`🔄 [Proxy #${connId}] Minting ticket from Hermes gateway...`);
    const attach = await getHermesAttachInfo();
    console.log(`🔗 [Proxy #${connId}] Attaching to Hermes Gateway at ${attach.url} (protocols: ${attach.protocols?.join(', ')})`);

    hermesWs = new SocketClient(attach.url, attach.protocols);

    hermesWs.onopen = () => {
      console.log(`✅ [Proxy #${connId}] Attached to Hermes Gateway backend`);
      // Flush client queue
      while (clientQueue.length > 0 && hermesWs.readyState === 1) {
        const item = clientQueue.shift();
        hermesWs.send(item);
      }
    };

    hermesWs.onmessage = (event) => {
      const frameText = typeof event.data === 'string' ? event.data : event.data.toString();
      // Forward frame to Wingman client
      if (clientWs.readyState === 1) {
        clientWs.send(frameText);
      }
    };

    hermesWs.onerror = (err) => {
      console.error(`❌ [Proxy #${connId}] Hermes Gateway backend error:`, err?.message || err);
    };

    hermesWs.onclose = (event) => {
      console.log(`⚠️ [Proxy #${connId}] Hermes Gateway backend closed: code=${event.code}, reason=${event.reason}`);
      if (!isClosing && clientWs.readyState === 1) {
        // Notify client
        clientWs.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'event',
          params: {
            type: 'gateway.disconnected',
            payload: { reason: 'Hermes backend closed' }
          }
        }));
      }
    };
  } catch (attachErr) {
    console.error(`❌ [Proxy #${connId}] Failed to connect to Hermes Gateway:`, attachErr.message);
    if (clientWs.readyState === 1) {
      clientWs.send(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `Proxy failed to connect to Hermes Gateway: ${attachErr.message}`,
        },
        id: null,
      }));
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const tokenList = Array.from(validTokens);
  const tokenSummary = tokenList.length > 0
    ? `${tokenList.length} configured (${tokenList.map(t => `${t.substring(0, 10)}...${t.substring(Math.max(0, t.length - 4))}`).join(', ')})`
    : 'None (Auth Disabled)';
  console.log(`=======================================================`);
  console.log(`🚀 HERMES TUI GATEWAY PROXY RUNNING on 0.0.0.0:${PORT}`);
  console.log(`   Host                 : ${os.hostname()}`);
  console.log(`   Client WebSocket URL : ws://0.0.0.0:${PORT}/?token=***`);
  console.log(`   Auth Active          : ${validTokens.size > 0 ? `YES (${tokenSummary})` : 'NO (Disabled)'}`);
  console.log(`   Health Status        : http://0.0.0.0:${PORT}/health`);
  console.log(`   Hermes Binary        : ${HERMES_BIN}`);
  console.log(`=======================================================\n`);
});
