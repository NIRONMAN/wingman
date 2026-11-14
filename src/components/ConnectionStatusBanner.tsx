import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { HermesClient } from '../services/hermes/client';

export const ConnectionStatusBanner: React.FC = () => {
  const connectionStatus = useChatStore((state) => state.connectionStatus);
  const serverUrl = useSettingsStore((state) => state.serverUrl);

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          dotColor: '#10B981',
          text: `Connected to Hermes (${serverUrl})`,
          bgColor: '#064E3B',
          canReconnect: false,
        };
      case 'connecting':
        return {
          dotColor: '#F59E0B',
          text: 'Connecting to Hermes...',
          bgColor: '#78350F',
          canReconnect: false,
        };
      case 'reconnecting':
        return {
          dotColor: '#F59E0B',
          text: 'Reconnecting to Hermes Node...',
          bgColor: '#78350F',
          canReconnect: false,
        };
      case 'error':
      case 'disconnected':
      default:
        return {
          dotColor: '#EF4444',
          text: 'Offline — Tap to Connect',
          bgColor: '#7F1D1D',
          canReconnect: true,
        };
    }
  };

  const config = getStatusConfig();

  const handlePress = () => {
    if (config.canReconnect) {
      HermesClient.getInstance().connect();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={config.canReconnect ? 0.7 : 1}
      onPress={handlePress}
      style={[styles.container, { backgroundColor: config.bgColor }]}
    >
      <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
      <Text style={styles.text}>{config.text}</Text>
      {config.canReconnect && <Text style={styles.actionText}>Connect</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  actionText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
