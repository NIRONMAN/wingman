import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification, JsonRpcMessage } from '../../types/hermes';

export class HermesProtocol {
  static createRequest(method: string, params?: any, id?: string | number): JsonRpcRequest {
    return {
      jsonrpc: '2.0',
      id: id ?? `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      method,
      params,
    };
  }

  static createResponse(id: string | number, result: any): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  static createError(id: string | number, code: number, message: string, data?: any): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
  }

  static createNotification(method: string, params?: any): JsonRpcNotification {
    return {
      jsonrpc: '2.0',
      method,
      params,
    };
  }

  static parseMessage(raw: string): JsonRpcMessage | null {
    try {
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return null;
      return data as JsonRpcMessage;
    } catch {
      return null;
    }
  }

  static isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
    return 'method' in msg && 'id' in msg && (msg as JsonRpcRequest).id !== undefined;
  }

  static isResponse(msg: JsonRpcMessage): msg is JsonRpcResponse {
    return 'id' in msg && !('method' in msg);
  }

  static isNotification(msg: JsonRpcMessage): msg is JsonRpcNotification {
    return 'method' in msg && !('id' in msg);
  }

  // TUI Gateway JSON-RPC Helpers
  static createSessionCreate(source: 'tui' | 'cli' | 'gui' = 'tui', id?: string | number): JsonRpcRequest {
    return this.createRequest('session.create', { source }, id);
  }

  static createPromptSubmit(
    sessionId: string,
    text: string,
    extraParams?: Record<string, any>,
    submissionId?: string,
    id?: string | number
  ): JsonRpcRequest {
    const subId = submissionId || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return this.createRequest(
      'prompt.submit',
      {
        session_id: sessionId,
        text,
        submission_id: subId,
        ...(extraParams || {}),
      },
      id
    );
  }

  static createGatewayPing(id?: string | number): JsonRpcRequest {
    return this.createRequest('gateway.ping', {}, id);
  }
}
