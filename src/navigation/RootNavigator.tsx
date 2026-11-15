import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ChatScreen } from '../screens/ChatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CallScreen } from '../screens/CallScreen';

export const RootNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'Chat' | 'Settings'>('Chat');

  const navigation = {
    navigate: (screen: 'Chat' | 'Settings') => setCurrentScreen(screen),
    goBack: () => setCurrentScreen('Chat'),
  };

  return (
    <View style={styles.container}>
      {currentScreen === 'Chat' ? (
        <ChatScreen navigation={navigation} />
      ) : (
        <SettingsScreen navigation={navigation} />
      )}

      {/* Global Call Screen Overlay */}
      <CallScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
