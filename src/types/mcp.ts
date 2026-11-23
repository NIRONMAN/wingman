export interface McpToolParameterProperty {
  type: string;
  description?: string;
  enum?: (string | number | boolean)[];
  default?: any;
  items?: McpToolParameterProperty;
  properties?: Record<string, McpToolParameterProperty>;
  required?: string[];
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, McpToolParameterProperty>;
  required?: string[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
  category?: 'hardware' | 'telemetry' | 'interaction' | 'system';
}

export interface McpContentItem {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

export interface McpToolResult {
  content: McpContentItem[];
  isError?: boolean;
}

export interface McpToolExecutionLog {
  id: string;
  toolName: string;
  timestamp: number;
  args: Record<string, any>;
  result?: McpToolResult;
  status: 'pending' | 'success' | 'failed' | 'denied';
  errorMessage?: string;
  durationMs?: number;
}
