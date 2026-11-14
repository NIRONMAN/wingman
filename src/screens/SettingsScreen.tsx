import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { useMcpLogStore } from '../store/useMcpLogStore';
import { useCallStore } from '../store/useCallStore';
import { HermesClient } from '../services/hermes/client';
import { NativeHapticsService } from '../services/mcp/hardware/nativeHaptics';
import { NativeTorchService } from '../services/mcp/hardware/nativeTorch';
import { NativeDeviceInfoService } from '../services/mcp/hardware/nativeDeviceInfo';

interface Props {
  navigation: any;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const {
    serverUrl,
    authToken,
    autoConnect,
    permissions,
    setServerUrl,
    setAuthToken,
    setAutoConnect,
    setPermission,
    resetDefaults,
  } = useSettingsStore();

  const { logs, clearLogs } = useMcpLogStore();

  const [urlInput, setUrlInput] = useState(serverUrl);
  const [tokenInput, setTokenInput] = useState(authToken);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handleSaveConnection = () => {
    setServerUrl(urlInput.trim());
    setAuthToken(tokenInput.trim());
    NativeHapticsService.trigger('light');
    HermesClient.getInstance().disconnect();
    HermesClient.getInstance().connect();
    Alert.alert('Settings Saved', 'Reconnecting to Hermes Node...');
  };

  // Self Tests
  const handleTestCall = () => {
    NativeHapticsService.trigger('heavy');
    useCallStore.getState().triggerIncomingCall({
      callId: `test_call_${Date.now()}`,
      callerName: 'Hermes Diagnostic Check',
      callerNumber: '+1 (800) DIAG-TEST',
      ttsScript: 'Self-test diagnostic complete. Both speaker audio and visual calling channels are fully functional.',
      autoDeclineTimeoutSec: 15,
    });
  };

  const handleTestHaptics = () => {
    NativeHapticsService.trigger('alert');
    Alert.alert('Haptics Test', 'Dispatched multi-stage alert vibration pattern.');
  };

  const handleTestFlashlight = () => {
    NativeHapticsService.trigger('light');
    NativeTorchService.setTorch('strobe', { strobeIntervalMs: 120, durationSec: 3 });
    Alert.alert('Torch Test', 'Flashlight strobe initiated for 3 seconds.');
  };

  const handleTestPing = async () => {
    NativeHapticsService.trigger('light');
    try {
      const pingReq = {
        jsonrpc: '2.0' as const,
        id: `ping_${Date.now()}`,
        method: 'ping',
        params: { clientTimestamp: Date.now() },
      };
      const response = await HermesClient.getInstance().send(pingReq);
      Alert.alert('Ping Success', `Hermes Node responded: ${JSON.stringify(response)}`);
    } catch (err: any) {
      Alert.alert('Ping Failed', err?.message || 'Server did not respond to ping');
    }
  };

  const handleTestTelemetry = async () => {
    NativeHapticsService.trigger('light');
    const data = await NativeDeviceInfoService.getTelemetry();
    Alert.alert(
      'Device Telemetry',
      `Battery: ${data.batteryLevel}%\nCharging: ${data.isCharging}\nNetwork: ${data.networkType}\nDevice: ${data.deviceModel}\nOS: ${data.systemName} ${data.systemVersion}`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>◀ Chat</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device & MCP Control</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Connection Profile */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>HERMES CONNECTION PROFILE</Text>

          <Text style={styles.fieldLabel}>Hermes Server URL (WebSocket)</Text>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="ws://127.0.0.1:8765"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>Auth Bearer Token / API Key</Text>
          <TextInput
            style={styles.input}
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="hermes-secret-token"
            placeholderTextColor="#64748B"
            secureTextEntry
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-reconnect on launch</Text>
            <Switch
              value={autoConnect}
              onValueChange={setAutoConnect}
              trackColor={{ false: '#334155', true: '#2563EB' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConnection}>
            <Text style={styles.saveBtnText}>Save & Reconnect</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Hardware Permissions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PHYSICAL MCP PERMISSIONS</Text>
          <Text style={styles.sectionSubtitle}>Control which phone features Hermes can actuate</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>📞 Simulated Phone Calls</Text>
            <Switch
              value={permissions.allowSimulatedCalls}
              onValueChange={(val) => setPermission('allowSimulatedCalls', val)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>🔦 Flashlight / Torch Control</Text>
            <Switch
              value={permissions.allowFlashlight}
              onValueChange={(val) => setPermission('allowFlashlight', val)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>📳 Haptic Vibrations & Morse</Text>
            <Switch
              value={permissions.allowHaptics}
              onValueChange={(val) => setPermission('allowHaptics', val)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>📸 Camera Snapshot</Text>
            <Switch
              value={permissions.allowCamera}
              onValueChange={(val) => setPermission('allowCamera', val)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>🔔 Native Heads-Up Notifications</Text>
            <Switch
              value={permissions.allowNotifications}
              onValueChange={(val) => setPermission('allowNotifications', val)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>📋 Clipboard Read / Write</Text>
            <Switch
              value={permissions.allowClipboard}
              onValueChange={(val) => setPermission('allowClipboard', val)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 3: Diagnostic Self-Tests */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>DIAGNOSTIC HARDWARE SELF-TESTS</Text>
          <Text style={styles.sectionSubtitle}>Manually test phone capabilities locally</Text>

          <View style={styles.testsGrid}>
            <TouchableOpacity style={styles.testBtn} onPress={handleTestCall}>
              <Text style={styles.testBtnIcon}>📞</Text>
              <Text style={styles.testBtnText}>Test Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testBtn} onPress={handleTestHaptics}>
              <Text style={styles.testBtnIcon}>📳</Text>
              <Text style={styles.testBtnText}>Test Haptic</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testBtn} onPress={handleTestFlashlight}>
              <Text style={styles.testBtnIcon}>🔦</Text>
              <Text style={styles.testBtnText}>Test Torch</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testBtn} onPress={handleTestTelemetry}>
              <Text style={styles.testBtnIcon}>🔋</Text>
              <Text style={styles.testBtnText}>Telemetry</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testBtn} onPress={handleTestPing}>
              <Text style={styles.testBtnIcon}>📡</Text>
              <Text style={styles.testBtnText}>Ping Server</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Live MCP Execution Log */}
        <View style={styles.sectionCard}>
          <View style={styles.logHeaderRow}>
            <Text style={styles.sectionTitle}>LIVE MCP EXECUTION LOG ({logs.length})</Text>
            {logs.length > 0 && (
              <TouchableOpacity onPress={clearLogs}>
                <Text style={styles.clearLogsText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {logs.length === 0 ? (
            <Text style={styles.emptyLogText}>No MCP tools executed yet. Dispatches from Hermes will appear here in real time.</Text>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              const statusColor =
                log.status === 'success' ? '#10B981' : log.status === 'failed' ? '#EF4444' : '#F59E0B';

              return (
                <TouchableOpacity
                  key={log.id}
                  style={styles.logItem}
                  onPress={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <View style={styles.logItemHeader}>
                    <Text style={styles.logToolName}>{log.toolName}</Text>
                    <View style={styles.logMeta}>
                      <Text style={[styles.statusBadge, { color: statusColor }]}>{log.status}</Text>
                      {log.durationMs !== undefined && (
                        <Text style={styles.durationText}>{log.durationMs}ms</Text>
                      )}
                      <Text style={styles.logTime}>{dateStr}</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.logDetails}>
                      <Text style={styles.logDetailLabel}>Arguments:</Text>
                      <Text style={styles.logCodeBlock}>{JSON.stringify(log.args, null, 2)}</Text>

                      {log.result && (
                        <>
                          <Text style={styles.logDetailLabel}>Result:</Text>
                          <Text style={styles.logCodeBlock}>{JSON.stringify(log.result, null, 2)}</Text>
                        </>
                      )}

                      {log.errorMessage && (
                        <Text style={styles.logErrorText}>Error: {log.errorMessage}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 13,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  switchLabel: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  testsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  testBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: '29%',
    flexGrow: 1,
  },
  testBtnIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  testBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearLogsText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyLogText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  logItem: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logToolName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  durationText: {
    color: '#64748B',
    fontSize: 10,
  },
  logTime: {
    color: '#475569',
    fontSize: 10,
  },
  logDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  logDetailLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  logCodeBlock: {
    backgroundColor: '#1E293B',
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
    padding: 6,
    borderRadius: 4,
  },
  logErrorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
  },
});
