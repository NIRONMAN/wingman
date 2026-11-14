import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ToolCallBadgeInfo } from '../types/chat';

interface Props {
  toolCall: ToolCallBadgeInfo;
}

export const ToolExecutionBadge: React.FC<Props> = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'simulate_call':
        return '📞';
      case 'toggle_flashlight':
        return '🔦';
      case 'trigger_haptics':
        return '📳';
      case 'capture_snapshot':
        return '📸';
      case 'get_device_telemetry':
        return '🔋';
      case 'send_notification':
        return '🔔';
      case 'access_clipboard':
        return '📋';
      case 'set_alarm_or_timer':
        return '⏰';
      default:
        return '⚙️';
    }
  };

  const getStatusColor = (status: ToolCallBadgeInfo['status']) => {
    switch (status) {
      case 'success':
        return '#10B981'; // Emerald green
      case 'failed':
        return '#EF4444'; // Red
      case 'pending':
      default:
        return '#F59E0B'; // Amber
    }
  };

  const statusColor = getStatusColor(toolCall.status);
  const statusLabel =
    toolCall.status === 'success'
      ? 'Executed'
      : toolCall.status === 'failed'
      ? 'Failed'
      : 'Executing...';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded(!expanded)}
      style={[styles.container, { borderLeftColor: statusColor }]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{getToolIcon(toolCall.toolName)}</Text>
        <View style={styles.titleContainer}>
          <Text style={styles.toolName}>{toolCall.toolName}</Text>
          <Text style={styles.subtext}>
            Physical MCP Action • <Text style={{ color: statusColor, fontWeight: '600' }}>{statusLabel}</Text>
          </Text>
        </View>
        <Text style={styles.expandHint}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {toolCall.resultSummary && !expanded && (
        <Text style={styles.summaryText} numberOfLines={2}>
          {toolCall.resultSummary}
        </Text>
      )}

      {expanded && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailHeading}>Arguments:</Text>
          <Text style={styles.codeBlock}>
            {JSON.stringify(toolCall.args, null, 2)}
          </Text>

          {toolCall.resultSummary && (
            <>
              <Text style={styles.detailHeading}>Result:</Text>
              <Text style={styles.codeBlock}>{toolCall.resultSummary}</Text>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
  },
  toolName: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  subtext: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  expandHint: {
    color: '#64748B',
    fontSize: 10,
    marginLeft: 6,
  },
  summaryText: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  detailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  detailHeading: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  codeBlock: {
    color: '#38BDF8',
    backgroundColor: '#0F172A',
    padding: 6,
    borderRadius: 4,
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
