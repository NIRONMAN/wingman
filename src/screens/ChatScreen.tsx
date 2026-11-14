import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useChatStore } from '../store/useChatStore';
import { HermesClient } from '../services/hermes/client';
import { MessageBubble } from '../components/MessageBubble';
import { ConnectionStatusBanner } from '../components/ConnectionStatusBanner';
import { QuickActionsDrawer } from '../components/QuickActionsDrawer';
import { AudioRecordModal } from '../components/AudioRecordModal';
import { NativeHapticsService } from '../services/mcp/hardware/nativeHaptics';

interface Props {
  navigation: any;
}

export const ChatScreen: React.FC<Props> = ({ navigation }) => {
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const [inputText, setInputText] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Connect to Hermes on mount
    HermesClient.getInstance().connect();
  }, []);

  useEffect(() => {
    // Auto scroll on new messages
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isStreaming]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    NativeHapticsService.trigger('light');
    const textToSend = inputText.trim();
    setInputText('');
    HermesClient.getInstance().sendMessage(textToSend);
  };

  const handleSendVoiceMemo = (durationSec: number) => {
    setShowVoiceModal(false);
    NativeHapticsService.trigger('heavy');
    HermesClient.getInstance().sendMessage('🎙️ [Voice Memo Sent]', {
      durationSec,
      audioUri: `voice_memo_${Date.now()}.aac`,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.hermesAvatar}>
            <Text style={styles.hermesAvatarText}>H</Text>
          </View>
          <View>
            <Text style={styles.title}>Hermes Wingman</Text>
            <Text style={styles.subtitle}>Physical MCP Node & Companion</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Connection Banner */}
      <ConnectionStatusBanner />

      {/* Messages FlatList */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Quick Physical Actions Drawer */}
        <QuickActionsDrawer onOpenVoiceMemo={() => setShowVoiceModal(true)} />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.micBtn}
            onPress={() => {
              NativeHapticsService.trigger('light');
              setShowVoiceModal(true);
            }}
          >
            <Text style={styles.micIcon}>🎙️</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Talk with Hermes or request action..."
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            disabled={!inputText.trim()}
            onPress={handleSend}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Voice Memo Modal */}
      <AudioRecordModal
        visible={showVoiceModal}
        onCancel={() => setShowVoiceModal(false)}
        onSend={handleSendVoiceMemo}
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hermesAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hermesAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  settingsIcon: {
    fontSize: 18,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  micIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
