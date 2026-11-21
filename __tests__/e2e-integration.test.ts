import { WebSocketServer } from 'ws';
import http from 'http';
import { HermesClient } from '../src/services/hermes/client';
import { HermesProtocol } from '../src/services/hermes/protocol';
import { useChatStore } from '../src/store/useChatStore';
import { useCallStore } from '../src/store/useCallStore';
import { useSettingsStore } from '../src/store/useSettingsStore';

describe('Hermes E2E Integration', () => {
  let server: http.Server;
  let wss: WebSocketServer;
  const TEST_PORT = 9876;
  let serverSocket: any = null;

  beforeAll((done) => {
    server = http.createServer();
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
      // Check auth token
      const url = new URL(req.url || '/', `http://127.0.0.1:${TEST_PORT}`);
      const token = url.searchParams.get('token') ||
                    (req.headers['authorization']?.replace(/^Bearer\s+/i, '')) ||
                    req.headers['x-auth-token'];

      if (token === 'invalid-token') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: 4401, message: 'Unauthorized: Invalid authentication token' },
          id: null,
        }));
        setTimeout(() => {
          ws.close(4401, 'Unauthorized');
        }, 20);
        return;
      }

      serverSocket = ws;

      // Announce gateway ready if TUI Gateway mode
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'event',
          params: {
            type: 'gateway.ready',
            payload: { skin: { name: 'default' } },
          },
        })
      );

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        // 1. TUI Gateway session.create
        if (msg.method === 'session.create') {
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: {
                session_id: 'test_tui_session_e2e_1',
                stored_session_id: 'test_tui_session_e2e_1',
              },
            })
          );
        }

        // 2. TUI Gateway prompt.submit
        if (msg.method === 'prompt.submit') {
          // Acknowledge submission
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: {
                admission_id: 'adm_e2e_1',
                status: 'streaming',
              },
            })
          );

          // Stream response deltas
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'event',
              params: {
                type: 'message.start',
                session_id: msg.params?.session_id,
              },
            })
          );

          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'event',
              params: {
                type: 'message.delta',
                session_id: msg.params?.session_id,
                payload: {
                  text: 'Hermes test stream response',
                },
              },
            })
          );

          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'event',
              params: {
                type: 'message.complete',
                session_id: msg.params?.session_id,
                payload: {
                  text: 'Hermes test stream response',
                },
              },
            })
          );
        }

        // 3. TUI Gateway ping
        if (msg.method === 'gateway.ping') {
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { ok: true },
            })
          );
        }

        // 4. Legacy initialize handshake
        if (msg.method === 'initialize') {
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { serverInfo: { name: 'Hermes Test Mock' } },
            })
          );
        }

        // 5. Legacy chat/send
        if (msg.method === 'chat/send') {
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { status: 'ok' },
            })
          );

          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'chat/stream_chunk',
              params: {
                messageId: 'test_stream_1',
                delta: 'Hermes test stream response',
                isComplete: true,
              },
            })
          );
        }
      });
    });

    server.listen(TEST_PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    HermesClient.getInstance().disconnect();
    wss.close(() => {
      server.close(done);
    });
  });

  it('connects to TUI Gateway and streams prompt response', async () => {
    useSettingsStore.getState().setServerUrl(`ws://127.0.0.1:${TEST_PORT}`);
    useSettingsStore.getState().setAuthToken('hermes-wingman-token-2026');
    useSettingsStore.getState().setConnectionMethod('tui_gateway');
    HermesClient.getInstance().connect();

    // Wait for connection
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (useChatStore.getState().connectionStatus === 'connected') {
          clearInterval(interval);
          resolve(true);
        }
      }, 50);
    });

    expect(useChatStore.getState().connectionStatus).toBe('connected');

    // Send a message
    HermesClient.getInstance().sendMessage('Hello Hermes from Wingman TUI Gateway');

    // Wait for stream response to arrive in chat store
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        const msgs = useChatStore.getState().messages;
        const streamMsg = msgs.find((m) => m.content.includes('Hermes test stream response'));
        if (streamMsg) {
          clearInterval(interval);
          resolve(true);
        }
      }, 50);
    });

    const msgs = useChatStore.getState().messages;
    expect(msgs.some((m) => m.content.includes('Hermes test stream response'))).toBe(true);
  });

  it('rejects connection with 4401 when token is invalid', async () => {
    HermesClient.getInstance().disconnect();
    useSettingsStore.getState().setServerUrl(`ws://127.0.0.1:${TEST_PORT}`);
    useSettingsStore.getState().setAuthToken('invalid-token');
    useSettingsStore.getState().setConnectionMethod('tui_gateway');

    HermesClient.getInstance().connect();

    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (useChatStore.getState().connectionStatus === 'error') {
          clearInterval(interval);
          resolve(true);
        }
      }, 50);
    });

    expect(useChatStore.getState().connectionStatus).toBe('error');
    const msgs = useChatStore.getState().messages;
    expect(
      msgs.some(
        (m) =>
          m.content.includes('4401 Unauthorized') ||
          m.content.includes('Unauthorized: Invalid authentication token')
      )
    ).toBe(true);

    // Restore valid token and reconnect for remaining tests
    useSettingsStore.getState().setAuthToken('hermes-wingman-token-2026');
    HermesClient.getInstance().connect();
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (useChatStore.getState().connectionStatus === 'connected') {
          clearInterval(interval);
          resolve(true);
        }
      }, 50);
    });
  });

  it('responds to gateway.ping test', async () => {
    const pingReq = HermesProtocol.createGatewayPing('ping_test_1');
    const response: any = await HermesClient.getInstance().send(pingReq);
    expect(response).toBeDefined();
    expect(response.ok).toBe(true);
  });

  it('handles server-initiated tools/call for simulate_call', async () => {
    expect(serverSocket).not.toBeNull();

    // Server calls simulate_call on client
    const toolCallPromise = new Promise((resolve) => {
      const onMessage = (data: any) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 'server_tool_req_1') {
          serverSocket.off('message', onMessage);
          resolve(msg);
        }
      };
      serverSocket.on('message', onMessage);
    });

    serverSocket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'server_tool_req_1',
        method: 'tools/call',
        params: {
          name: 'simulate_call',
          arguments: {
            callerName: 'E2E Emergency Office',
            callerNumber: '+1 555-999-0000',
            ttsScript: 'Production incident briefing',
          },
        },
      })
    );

    const clientResponse: any = await toolCallPromise;
    expect(clientResponse.result).toBeDefined();
    expect(clientResponse.result.content[0].text).toContain('E2E Emergency Office');

    // Verify phone call state updated to ringing
    expect(useCallStore.getState().state).toBe('ringing');
    expect(useCallStore.getState().currentCall?.callerName).toBe('E2E Emergency Office');
  });
});
