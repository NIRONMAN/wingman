import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../types/chat';
import { ToolExecutionBadge } from './ToolExecutionBadge';

interface Props {
  message: ChatMessage;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simple clean markdown parser for React Native text rendering
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');

    return lines.map((line, idx) => {
      // Bullet list items
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Handle bold **text**
      const parts = cleanLine.split(/(\*\*.*?\*\*|`.*?`)/g);

      return (
        <View key={idx} style={[styles.textLine, isBullet && styles.bulletLine]}>
          {isBullet && <Text style={[styles.bulletPoint, isUser && styles.userText]}>• </Text>}
          <Text style={[styles.baseText, isUser ? styles.userText : styles.assistantText]}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <Text key={pIdx} style={styles.boldText}>
                    {part.slice(2, -2)}
                  </Text>
                );
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <Text key={pIdx} style={isUser ? styles.userCodeText : styles.codeText}>
                    {part.slice(1, -1)}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        </View>
      );
    });
  };

  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.roleHeader}>
            <Text style={styles.roleName}>HERMES</Text>
            {message.isStreaming && (
              <View style={styles.streamingIndicator}>
                <View style={styles.pulseDot} />
                <Text style={styles.streamingText}>Streaming...</Text>
              </View>
            )}
          </View>
        )}

        {message.voiceMemo && (
          <View style={styles.voiceMemoCard}>
            <Text style={styles.voiceIcon}>🎙️</Text>
            <View style={styles.voiceInfo}>
              <Text style={styles.voiceTitle}>Voice Memo</Text>
              <Text style={styles.voiceDuration}>{message.voiceMemo.durationSec}s audio clip</Text>
            </View>
          </View>
        )}

        {message.content ? renderFormattedText(message.content) : null}

        {message.toolCall && <ToolExecutionBadge toolCall={message.toolCall} />}

        <View style={styles.footerRow}>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
            {formatTimestamp(message.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#2563EB', // Blue
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#1E293B', // Slate dark
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleName: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
    marginRight: 4,
  },
  streamingText: {
    color: '#94A3B8',
    fontSize: 10,
    fontStyle: 'italic',
  },
  textLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 1,
  },
  bulletLine: {
    paddingLeft: 4,
  },
  bulletPoint: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  baseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#F1F5F9',
  },
  boldText: {
    fontWeight: '700',
  },
  codeText: {
    backgroundColor: '#0F172A',
    color: '#38BDF8',
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  userCodeText: {
    backgroundColor: '#1D4ED8',
    color: '#E0F2FE',
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  voiceMemoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  voiceIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  voiceDuration: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  footerRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 10,
  },
  userTimestamp: {
    color: '#BFDBFE',
  },
  assistantTimestamp: {
    color: '#64748B',
  },
  systemContainer: {
    alignSelf: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  systemText: {
    color: '#94A3B8',
    fontSize: 11,
  },
});
