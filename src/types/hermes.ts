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

export interface TuiGatewayReadyPayload {
  skin?: any;
  change_events?: boolean;
  heartbeat?: boolean;
  replay_epoch?: string;
  session_authority?: boolean;
}

export interface TuiMessageDeltaPayload {
  text: string | null;
  rendered?: string | null;
  turn_id?: string | null;
  segment?: number | null;
  offset?: number | null;
}

export interface TuiMessageCompletePayload {
  text?: string;
  turn_id?: string;
  usage?: any;
}

export interface TuiSessionCreateResult {
  session_id: string;
  stored_session_id?: string;
  model?: string;
  source?: string;
  info?: any;
}

export interface TuiPromptSubmitResult {
  admission_id?: string;
  status?: string;
  ref?: {
    profile_id: string;
    session_id: string;
  };
}
