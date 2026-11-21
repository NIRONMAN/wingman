/**
 * Hermes TUI Gateway Proxy / Middleman Server
 * 
 * Sits on the Ultron host (0.0.0.0:8765) and bridges external client connections
 * (such as the Wingman mobile app or emulator) to the local Hermes Gateway
 * via the official TUI Gateway JSON-RPC protocol (hermes-gateway-v1).
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
const crypto = require('crypto');
const { WebSocketServer, WebSocket: WsClient } = require('ws');
const { execSync, exec } = require('child_process');

const PORT = parseInt(process.env.PORT || '8765', 10);
const HERMES_BIN = process.env.HERMES_BIN || '/home/u0_a205/.local/bin/hermes';
const AUTH_TOKEN = (process.env.HERMES_GATEWAY_TOKEN || process.env.WINGMAN_AUTH_TOKEN || '').trim();

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
  if (!AUTH_TOKEN) return true; // Auth disabled if token is explicitly empty
  const clientToken = extractAuthToken(req);
  if (!clientToken) return false;

  try {
    const clientBuf = Buffer.from(clientToken);
    const authBuf = Buffer.from(AUTH_TOKEN);
    if (clientBuf.length !== authBuf.length) return false;
    return crypto.timingSafeEqual(clientBuf, authBuf);
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

  // Public health check endpoint for Cloudflare Tunnel / monitoring
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      status: 'online',
      protocol: 'tui_gateway_jsonrpc',
      port: PORT,
      authRequired: Boolean(AUTH_TOKEN),
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
      port: PORT,
      authRequired: Boolean(AUTH_TOKEN),
      activeClients: clientConnections.size,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found. Connect via WebSocket on ws://<host>:' + PORT }));
});

// WebSocket Server
const wss = new WebSocketServer({ server });
const clientConnections = new Set();
let connectionCounter = 1;

/**
 * Mint a fresh connection ticket from Hermes Gateway
 */
function getHermesAttachInfo() {
  return new Promise((resolve, reject) => {
    exec(`${HERMES_BIN} gateway attach --json --start`, { timeout: 15000 }, (err, stdout, stderr) => {
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
  const maskedToken = AUTH_TOKEN
    ? `${AUTH_TOKEN.substring(0, 10)}...${AUTH_TOKEN.substring(Math.max(0, AUTH_TOKEN.length - 4))}`
    : 'None (Auth Disabled)';
  console.log(`=======================================================`);
  console.log(`🚀 HERMES TUI GATEWAY PROXY RUNNING on 0.0.0.0:${PORT}`);
  console.log(`   Client WebSocket URL : ws://0.0.0.0:${PORT}/?token=***`);
  console.log(`   Auth Active          : ${AUTH_TOKEN ? `YES (${maskedToken})` : 'NO (Disabled)'}`);
  console.log(`   Health Status        : http://0.0.0.0:${PORT}/health`);
  console.log(`   Hermes Binary        : ${HERMES_BIN}`);
  console.log(`=======================================================\n`);
});
