import { WebSocketServer } from 'ws';
import http from 'http';
import { HermesClient } from '../src/services/hermes/client';
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

    wss.on('connection', (ws) => {
      serverSocket = ws;

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        // Handle initialize handshake
        if (msg.method === 'initialize') {
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { serverInfo: { name: 'Hermes Test Mock' } },
            })
          );
        }

        // Handle chat/send
        if (msg.method === 'chat/send') {
          // Acknowledge
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { status: 'ok' },
            })
          );

          // Stream reply
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

  it('connects to Hermes server and streams chat response', async () => {
    useSettingsStore.getState().setServerUrl(`ws://127.0.0.1:${TEST_PORT}`);
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
    HermesClient.getInstance().sendMessage('Hello Hermes from Wingman');

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
