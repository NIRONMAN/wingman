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
  private isIntentionallyClosed = false;

  public static getInstance(): HermesClient {
    if (!HermesClient.instance) {
      HermesClient.instance = new HermesClient();
    }
    return HermesClient.instance;
  }

  public connect(): void {
    this.isIntentionallyClosed = false;
    const { serverUrl, authToken } = useSettingsStore.getState();

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
      const urlWithProtocol = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `ws://${serverUrl}`;

      this.ws = new WebSocketImpl(urlWithProtocol);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        useChatStore.getState().setConnectionStatus('connected');

        // Send handshake & capability announcement
        this.sendHandshake(authToken);

        // Flush offline queue
        this.flushQueue();
      };

      this.ws.onmessage = (event: any) => {
        this.handleRawMessage(event.data);
      };

      this.ws.onerror = (error: any) => {
        // Socket error; will trigger onclose
      };

      this.ws.onclose = () => {
        this.cleanupSocket();
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

  public sendMessage(text: string, voiceMemo?: { durationSec: number; audioUri?: string }): string {
    const chatStore = useChatStore.getState();

    // Add user message to local chat immediately
    const userMsgId = chatStore.addMessage({
      role: 'user',
      content: text,
      voiceMemo,
    });

    // Prepare JSON-RPC request for Hermes
    const chatReq = HermesProtocol.createRequest('chat/send', {
      messageId: userMsgId,
      text,
      voiceMemo,
    });

    this.send(chatReq);
    return userMsgId;
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

    // 2. Handle Request from Hermes (e.g. MCP tools/list, tools/call)
    if (HermesProtocol.isRequest(msg)) {
      await this.handleIncomingRequest(msg);
      return;
    }

    // 3. Handle Streaming / Notifications from Hermes
    if (HermesProtocol.isNotification(msg)) {
      this.handleIncomingNotification(msg);
      return;
    }
  }

  private async handleIncomingRequest(req: JsonRpcRequest): Promise<void> {
    const { method, params, id } = req;

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

    // Ping
    if (method === 'ping') {
      const response = HermesProtocol.createResponse(id, { pong: true, timestamp: Date.now() });
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

    // Streaming chunk
    if (method === 'chat/stream_chunk' || method === 'chat.stream.chunk') {
      const { delta, messageId, isComplete } = params;

      if (!chatStore.isStreaming || chatStore.streamingMessageId !== messageId) {
        // Start streaming message if not already active
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
