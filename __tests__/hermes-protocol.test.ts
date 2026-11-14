import { HermesProtocol } from '../src/services/hermes/protocol';

describe('HermesProtocol', () => {
  it('creates valid JSON-RPC 2.0 requests', () => {
    const req = HermesProtocol.createRequest('tools/call', { name: 'toggle_flashlight' }, 'req_1');
    expect(req.jsonrpc).toBe('2.0');
    expect(req.id).toBe('req_1');
    expect(req.method).toBe('tools/call');
    expect(req.params).toEqual({ name: 'toggle_flashlight' });
    expect(HermesProtocol.isRequest(req)).toBe(true);
    expect(HermesProtocol.isResponse(req)).toBe(false);
  });

  it('creates valid JSON-RPC 2.0 responses', () => {
    const res = HermesProtocol.createResponse('req_1', { success: true });
    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe('req_1');
    expect(res.result).toEqual({ success: true });
    expect(HermesProtocol.isResponse(res)).toBe(true);
    expect(HermesProtocol.isRequest(res as any)).toBe(false);
  });

  it('creates valid JSON-RPC 2.0 errors', () => {
    const err = HermesProtocol.createError('req_1', -32601, 'Method not found');
    expect(err.jsonrpc).toBe('2.0');
    expect(err.error?.code).toBe(-32601);
    expect(err.error?.message).toBe('Method not found');
  });

  it('creates valid JSON-RPC notifications', () => {
    const notif = HermesProtocol.createNotification('chat/stream_chunk', { delta: 'Hello' });
    expect(notif.jsonrpc).toBe('2.0');
    expect(notif.method).toBe('chat/stream_chunk');
    expect((notif as any).id).toBeUndefined();
    expect(HermesProtocol.isNotification(notif)).toBe(true);
  });

  it('parses JSON strings correctly and rejects invalid JSON', () => {
    const parsed = HermesProtocol.parseMessage('{"jsonrpc":"2.0","method":"ping"}');
    expect((parsed as any)?.method).toBe('ping');

    const invalid = HermesProtocol.parseMessage('not json');
    expect(invalid).toBeNull();
  });
});
