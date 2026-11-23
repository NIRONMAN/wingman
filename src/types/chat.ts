import { McpToolResult } from './mcp';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCallBadgeInfo {
  toolName: string;
  args: Record<string, any>;
  status: 'pending' | 'success' | 'failed';
  resultSummary?: string;
}

export interface ImageAttachment {
  uri?: string;
  base64?: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  toolCall?: ToolCallBadgeInfo;
  voiceMemo?: {
    durationSec: number;
    audioUri?: string;
  };
  imageAttachment?: ImageAttachment;
}

export interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  promptOrAction: string;
  isDirectTool?: boolean;
  directToolName?: string;
  directToolArgs?: Record<string, any>;
}
