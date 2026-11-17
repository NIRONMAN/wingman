import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { HermesClient } from '../services/hermes/client';
import { McpRegistry } from '../services/mcp/registry';
import { NativeHapticsService } from '../services/mcp/hardware/nativeHaptics';

interface Props {
  onOpenVoiceMemo: () => void;
}

export const QuickActionsDrawer: React.FC<Props> = ({ onOpenVoiceMemo }) => {
  const handleRescueCall = () => {
    NativeHapticsService.trigger('heavy');
    HermesClient.getInstance().sendMessage(
      '🚨 Rescue call requested! Call my phone right now with an urgent excuse so I can step away.'
    );
  };

  const handleSnapInspect = async () => {
    NativeHapticsService.trigger('light');
    const result = await McpRegistry.executeTool('capture_snapshot', {
      cameraType: 'back',
      quality: 0.8,
    });
    const summary = result.content.find((c) => c.type === 'text')?.text || 'Snapshot captured';
    HermesClient.getInstance().sendMessage(
      `📸 [Live Camera Snapshot Attached]: ${summary}\nPlease inspect this visual frame and tell me what you see.`
    );
  };

  const handleFlashlightStrobe = () => {
    NativeHapticsService.trigger('alert');
    McpRegistry.executeTool('toggle_flashlight', {
      mode: 'strobe',
      durationSec: 4,
      strobeIntervalMs: 120,
    });
  };

  const handleDeviceTelemetry = async () => {
    NativeHapticsService.trigger('light');
    const result = await McpRegistry.executeTool('get_device_telemetry', {});
    const telemetryJson = result.content[0]?.text || '{}';
    HermesClient.getInstance().sendMessage(
      `🔋 Device telemetry query: Here is my physical phone state:\n\`\`\`json\n${telemetryJson}\n\`\`\`\nCan you analyze my battery health and network connection?`
    );
  };

  const handleQuickAlarm = () => {
    NativeHapticsService.trigger('light');
    HermesClient.getInstance().sendMessage(
      '⏰ Can you set an alarm for 7:00 AM labeled "Morning Standup" on my phone?'
    );
  };

  const handleQuickReminder = () => {
    NativeHapticsService.trigger('light');
    HermesClient.getInstance().sendMessage(
      '🔔 Can you set a reminder for me in 20 minutes to "Review project notes"?'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>QUICK PHYSICAL ACTIONS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={[styles.actionCard, styles.rescueCard]} onPress={handleRescueCall}>
          <Text style={styles.actionIcon}>🚨</Text>
          <Text style={styles.actionLabel}>Rescue Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={onOpenVoiceMemo}>
          <Text style={styles.actionIcon}>🎙️</Text>
          <Text style={styles.actionLabel}>Voice Memo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleSnapInspect}>
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionLabel}>Snap & Inspect</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleFlashlightStrobe}>
          <Text style={styles.actionIcon}>🔦</Text>
          <Text style={styles.actionLabel}>Torch Strobe</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleDeviceTelemetry}>
          <Text style={styles.actionIcon}>🔋</Text>
          <Text style={styles.actionLabel}>Telemetry</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleQuickAlarm}>
          <Text style={styles.actionIcon}>⏰</Text>
          <Text style={styles.actionLabel}>Set Alarm</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleQuickReminder}>
          <Text style={styles.actionIcon}>🔔</Text>
          <Text style={styles.actionLabel}>Set Reminder</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 8,
  },
  headerTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  actionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rescueCard: {
    backgroundColor: '#451A1A',
    borderColor: '#7F1D1D',
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionLabel: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '600',
  },
});
