import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { HermesClient } from '../services/hermes/client';
import { McpRegistry } from '../services/mcp/registry';
import { NativeHapticsService } from '../services/mcp/hardware/nativeHaptics';
import { useCallStore } from '../store/useCallStore';

interface Props {
  onOpenVoiceMemo: () => void;
}

export const QuickActionsDrawer: React.FC<Props> = ({ onOpenVoiceMemo }) => {
  const handleDemoCall = () => {
    NativeHapticsService.trigger('heavy');
    useCallStore.getState().triggerIncomingCall({
      callId: `urgent_demo_${Date.now()}`,
      callerName: 'Hermes AI (Urgent Priority)',
      callerNumber: '+1 (800) HERMES-AI',
      ttsScript: 'Urgent attention required. This is a demonstration of an incoming urgent call from your Hermes companion. Voice channel is active and responsive.',
      autoDeclineTimeoutSec: 25,
    });
  };

  const handleSnapInspect = async () => {
    NativeHapticsService.trigger('light');
    try {
      const result = await McpRegistry.executeTool('capture_snapshot', {
        cameraType: 'back',
        quality: 0.8,
      });
      const summary = result.content.find((c) => c.type === 'text')?.text || 'Snapshot captured';
      const imgItem = result.content.find((c) => c.type === 'image');
      const base64Data = (imgItem as any)?.data;
      const mimeType = (imgItem as any)?.mimeType || 'image/jpeg';
      const uri = (imgItem as any)?.uri;

      HermesClient.getInstance().sendMessage(
        `📸 [Live Camera Snapshot Attached]: ${summary}\nPlease inspect this visual frame and tell me what you see.`,
        {
          imageAttachment: base64Data
            ? {
                base64: base64Data,
                uri,
                mimeType,
              }
            : undefined,
        }
      );
    } catch (err: any) {
      console.error('[QuickActionsDrawer] Snap & inspect failed:', err);
    }
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
        <TouchableOpacity style={[styles.actionCard, styles.callCard]} onPress={handleDemoCall}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionLabel}>Demo Call</Text>
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
  callCard: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
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
