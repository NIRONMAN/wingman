import { McpToolDefinition, McpToolResult } from './mcp';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface HermesServerProfile {
  name: string;
  url: string;
  authToken: string;
  autoConnect: boolean;
}

export interface ChatStreamChunk {
  streamId: string;
  messageId: string;
  delta: string;
  isComplete: boolean;
}

export interface HermesToolCallParams {
  name: string;
  arguments: Record<string, any>;
}
