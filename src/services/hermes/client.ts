import { HermesProtocol } from './protocol';
import { McpRegistry } from '../mcp/registry';
import { useChatStore } from '../../store/useChatStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcMessage, ConnectionState } from '../../types/hermes';

export class HermesClient {
  private static instance: HermesClient | null = null;
  private ws: any = null;
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectDelayMs = 10000;
  private pendingRequests: Map<string | number, { resolve: (res: any) => void; reject: (err: any) => void }> = new Map();
  private outgoingQueue: string[] = [];
  private pendingPromptsQueue: string[] = [];
  private isIntentionallyClosed = false;
  private currentSessionId: string | null = null;
  private isCreatingSession = false;

  public static getInstance(): HermesClient {
    if (!HermesClient.instance) {
      HermesClient.instance = new HermesClient();
    }
    return HermesClient.instance;
  }

  public getSessionId(): string | null {
    return this.currentSessionId;
  }

  public setSessionId(sessionId: string | null): void {
    this.currentSessionId = sessionId;
  }

  public connect(): void {
    this.isIntentionallyClosed = false;
    const { serverUrl, authToken, connectionMethod } = useSettingsStore.getState();

    if (!serverUrl) {
      useChatStore.getState().setConnectionStatus('error');
      return;
    }

    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      return; // Already connecting or connected
    }

    useChatStore.getState().setConnectionStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      // In React Native and modern Node, WebSocket is globally available
      const WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : (require('ws') as any);
      let targetUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `ws://${serverUrl}`;

      // Append auth token as query parameter if provided and not already present
      if (authToken && authToken.trim()) {
        try {
          const parsed = new URL(targetUrl);
          if (!parsed.searchParams.has('token') && !parsed.searchParams.has('authToken') && !parsed.searchParams.has('auth_token')) {
            parsed.searchParams.set('token', authToken.trim());
          }
          targetUrl = parsed.toString();
        } catch {
          const sep = targetUrl.includes('?') ? '&' : '?';
          targetUrl = `${targetUrl}${sep}token=${encodeURIComponent(authToken.trim())}`;
        }
      }

      console.log(`[HermesClient] Connecting to: ${targetUrl} (mode: ${connectionMethod})`);

      // In environments supporting custom headers (React Native, Node ws), pass Authorization headers
      const wsOptions = authToken && authToken.trim() ? {
        headers: {
          Authorization: `Bearer ${authToken.trim()}`,
          'X-Auth-Token': authToken.trim(),
        },
      } : undefined;

      this.ws = new WebSocketImpl(targetUrl, undefined, wsOptions);

      this.ws.onopen = () => {
        console.log('[HermesClient] Connected successfully to:', targetUrl);
        this.reconnectAttempts = 0;
        useChatStore.getState().setConnectionStatus('connected');

        if (connectionMethod === 'mock') {
          // Send legacy handshake & capability announcement
          this.sendHandshake(authToken);
        } else {
          // TUI Gateway: wait for gateway.ready or send session.create
          console.log('[HermesClient] Initializing TUI Gateway session...');
          this.createTuiSession();
        }

        // Flush offline queue
        this.flushQueue();
      };

      this.ws.onmessage = (event: any) => {
        this.handleRawMessage(event.data);
      };

      this.ws.onerror = (error: any) => {
        console.log('[HermesClient] WebSocket error:', error?.message || error);
      };

      this.ws.onclose = (event: any) => {
        console.log('[HermesClient] WebSocket closed:', event?.code, event?.reason);
        this.cleanupSocket();

        if (event?.code === 4401) {
          console.warn('[HermesClient] Connection rejected: 4401 Unauthorized');
          useChatStore.getState().setConnectionStatus('error');
          useChatStore.getState().addMessage({
            role: 'assistant',
            content: `🔒 **Connection Rejected (4401 Unauthorized)**: Invalid or missing authentication token. Please verify the Auth Token in Settings.`,
          });
          return;
        }

        if (!this.isIntentionallyClosed) {
          useChatStore.getState().setConnectionStatus('disconnected');
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.cleanupSocket();
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupSocket();
    useChatStore.getState().setConnectionStatus('disconnected');
  }

  private cleanupSocket(): void {
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isIntentionallyClosed) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelayMs);
    useChatStore.getState().setConnectionStatus('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private sendHandshake(authToken: string): void {
    const handshakeReq = HermesProtocol.createRequest('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: {
        name: 'Wingman Mobile MCP Node',
        version: '1.0.0',
        platform: 'React Native',
      },
      authToken,
      capabilities: {
        tools: {
          listChanged: true,
        },
        chat: {
          streaming: true,
          voiceMemo: true,
        },
      },
    });

    this.sendRaw(JSON.stringify(handshakeReq));
  }

  /**
   * Request a new or resumed session from the TUI Gateway
   */
  public async createTuiSession(source: 'tui' | 'cli' | 'gui' = 'tui'): Promise<string | null> {
    if (this.isCreatingSession) return null;
    this.isCreatingSession = true;

    try {
      const createReq = HermesProtocol.createSessionCreate(source);
      console.log('[HermesClient] Requesting session.create on TUI Gateway...');
      const response: any = await this.send(createReq);

      if (response && response.session_id) {
        this.currentSessionId = response.session_id;
        console.log('[HermesClient] TUI Gateway session established:', this.currentSessionId);

        // Flush any prompts that were queued waiting for a session
        this.flushPendingPrompts();
        return this.currentSessionId;
      }
    } catch (err: any) {
      console.error('[HermesClient] Failed to create TUI session:', err?.message || err);
    } finally {
      this.isCreatingSession = false;
    }

    return null;
  }

  public sendMessage(text: string, voiceMemo?: { durationSec: number; audioUri?: string }): string {
    const chatStore = useChatStore.getState();
    const { connectionMethod } = useSettingsStore.getState();

    // Add user message to local chat immediately
    const userMsgId = chatStore.addMessage({
      role: 'user',
      content: text,
      voiceMemo,
    });

    if (connectionMethod === 'tui_gateway') {
      if (!this.currentSessionId) {
        console.log('[HermesClient] No active session ID, queueing prompt and creating session...');
        this.pendingPromptsQueue.push(text);
        this.createTuiSession();
      } else {
        const promptReq = HermesProtocol.createPromptSubmit(this.currentSessionId, text);
        this.send(promptReq).catch((err) => {
          console.error('[HermesClient] prompt.submit error:', err?.message || err);
        });
      }
    } else {
      // Legacy Mock protocol
      const chatReq = HermesProtocol.createRequest('chat/send', {
        messageId: userMsgId,
        text,
        voiceMemo,
      });
      this.send(chatReq);
    }

    return userMsgId;
  }

  private flushPendingPrompts(): void {
    if (!this.currentSessionId) return;

    while (this.pendingPromptsQueue.length > 0) {
      const text = this.pendingPromptsQueue.shift();
      if (text) {
        const promptReq = HermesProtocol.createPromptSubmit(this.currentSessionId, text);
        this.send(promptReq).catch((err) => {
          console.error('[HermesClient] Error sending queued prompt:', err?.message || err);
        });
      }
    }
  }

  public send(msg: JsonRpcMessage): Promise<any> {
    const serialized = JSON.stringify(msg);

    if (HermesProtocol.isRequest(msg)) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(msg.id, { resolve, reject });
        this.sendRaw(serialized);
      });
    }

    this.sendRaw(serialized);
    return Promise.resolve();
  }

  private sendRaw(data: string): void {
    if (this.ws && this.ws.readyState === 1) {
      try {
        this.ws.send(data);
      } catch {
        this.outgoingQueue.push(data);
      }
    } else {
      // Queue when disconnected
      this.outgoingQueue.push(data);
      this.connect();
    }
  }

  private flushQueue(): void {
    while (this.outgoingQueue.length > 0 && this.ws && this.ws.readyState === 1) {
      const item = this.outgoingQueue.shift();
      if (item) {
        try {
          this.ws.send(item);
        } catch {
          this.outgoingQueue.unshift(item);
          break;
        }
      }
    }
  }

  private async handleRawMessage(rawData: string | any): Promise<void> {
    const text = typeof rawData === 'string' ? rawData : rawData.toString();
    const msg = HermesProtocol.parseMessage(text);
    if (!msg) return;

    // Handle top-level Gateway error frames (e.g. 4401 Unauthorized or -32000 Gateway Error)
    if ((msg as any).error && ((msg as any).id === null || (msg as any).id === undefined)) {
      const err = (msg as any).error;
      console.error('[HermesClient] Gateway error frame:', err.message);
      useChatStore.getState().setConnectionStatus('error');
      useChatStore.getState().addMessage({
        role: 'assistant',
        content: `🔒 **Gateway Error**: ${err.message || 'Authentication failed'}`,
      });
      return;
    }

    // 1. Handle Response to an earlier client request
    if (HermesProtocol.isResponse(msg)) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          pending.reject(msg.error);
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    // 2. Handle Request from Hermes (e.g. MCP tools/list, tools/call, ping)
    if (HermesProtocol.isRequest(msg)) {
      await this.handleIncomingRequest(msg);
      return;
    }

    // 3. Handle Streaming / Notifications from Hermes (including TUI Gateway events)
    if (HermesProtocol.isNotification(msg)) {
      this.handleIncomingNotification(msg);
      return;
    }
  }

  private async handleIncomingRequest(req: JsonRpcRequest): Promise<void> {
    const { method, params, id } = req;

    // TUI Gateway ping
    if (method === 'gateway.ping' || method === 'ping') {
      const response = HermesProtocol.createResponse(id, { ok: true, timestamp: Date.now() });
      this.sendRaw(JSON.stringify(response));
      return;
    }

    // MCP: List available tools
    if (method === 'tools/list') {
      const toolsList = McpRegistry.listTools();
      const response = HermesProtocol.createResponse(id, toolsList);
      this.sendRaw(JSON.stringify(response));
      return;
    }

    // MCP: Call tool on phone
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      // Post inline tool execution announcement in chat
      const chatStore = useChatStore.getState();
      const toolMsgId = chatStore.addMessage({
        role: 'assistant',
        content: `⚡ Executing physical action: **\`${toolName}\`**...`,
        toolCall: {
          toolName,
          args: toolArgs,
          status: 'pending',
        },
      });

      // Execute on device
      const result = await McpRegistry.executeTool(toolName, toolArgs);

      // Update chat message with status badge
      const summaryText = result.content?.find((c) => c.type === 'text')?.text || 'Executed';
      chatStore.updateMessageToolBadge(toolMsgId, {
        toolName,
        args: toolArgs,
        status: result.isError ? 'failed' : 'success',
        resultSummary: summaryText,
      });

      // Return MCP response to Hermes
      const response = HermesProtocol.createResponse(id, result);
      this.sendRaw(JSON.stringify(response));
      return;
    }

    // Unknown method
    const errResponse = HermesProtocol.createError(id, -32601, `Method not found: ${method}`);
    this.sendRaw(JSON.stringify(errResponse));
  }

  private handleIncomingNotification(notif: any): void {
    const { method, params } = notif;
    const chatStore = useChatStore.getState();

    // ─── TUI Gateway Event Notifications ───
    if (method === 'event' && params) {
      const eventType = params.type;
      const payload = params.payload || {};

      // Gateway ready announcement
      if (eventType === 'gateway.ready') {
        console.log('[HermesClient] Received gateway.ready from TUI Gateway');
        chatStore.setConnectionStatus('connected');
        if (!this.currentSessionId) {
          this.createTuiSession();
        }
        return;
      }

      // Turn began streaming
      if (eventType === 'message.start') {
        if (!chatStore.isStreaming) {
          chatStore.startStreamingMessage('assistant', '');
        }
        return;
      }

      // Stream delta chunk from assistant
      if (eventType === 'message.delta') {
        const delta = payload.text || '';
        if (delta) {
          if (!chatStore.isStreaming || !chatStore.streamingMessageId) {
            chatStore.startStreamingMessage('assistant', delta);
          } else {
            chatStore.appendStreamChunk(chatStore.streamingMessageId, delta);
          }
        }
        return;
      }

      // Turn ended: final assistant reply
      if (eventType === 'message.complete') {
        if (chatStore.isStreaming && chatStore.streamingMessageId) {
          chatStore.finishStreamingMessage(chatStore.streamingMessageId);
        } else if (payload.text) {
          // If no streaming message was active, add as complete message
          chatStore.addMessage({
            role: 'assistant',
            content: payload.text,
          });
        }
        return;
      }

      // Error event from Hermes
      if (eventType === 'error') {
        const errMsg = payload.message || 'Hermes turn error';
        console.warn('[HermesClient] Error event:', errMsg);
        if (chatStore.isStreaming && chatStore.streamingMessageId) {
          chatStore.finishStreamingMessage(chatStore.streamingMessageId);
        }
        chatStore.addMessage({
          role: 'assistant',
          content: `⚠️ **Hermes Error**: ${errMsg}`,
        });
        return;
      }

      return;
    }

    // ─── Legacy Mock Server Notifications ───
    // Streaming chunk
    if (method === 'chat/stream_chunk' || method === 'chat.stream.chunk') {
      const { delta, messageId, isComplete } = params;

      if (!chatStore.isStreaming || chatStore.streamingMessageId !== messageId) {
        const activeId = chatStore.startStreamingMessage('assistant', delta || '');
        if (isComplete) {
          chatStore.finishStreamingMessage(activeId);
        }
      } else {
        if (delta) {
          chatStore.appendStreamChunk(messageId, delta);
        }
        if (isComplete) {
          chatStore.finishStreamingMessage(messageId);
        }
      }
      return;
    }

    // Full assistant response
    if (method === 'chat/message' || method === 'chat.message') {
      chatStore.addMessage({
        role: 'assistant',
        content: params?.content || params?.text || '',
      });
      return;
    }
  }
}
