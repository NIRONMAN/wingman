import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useCallStore } from '../store/useCallStore';

export const CallScreen: React.FC = () => {
  const {
    state,
    currentCall,
    activeDurationSec,
    isMuted,
    isSpeakerOn,
    isTtsSpeaking,
    ttsTranscriptSoFar,
    answerCall,
    declineCall,
    endActiveCall,
    toggleMute,
    toggleSpeaker,
  } = useCallStore();

  if (state === 'idle') {
    return null;
  }

  const formatCallTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const callerName = currentCall?.callerName || 'Hermes Assistant';
  const callerNumber = currentCall?.callerNumber || '+1 (800) HERMES-AI';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Ringing View */}
      {state === 'ringing' && (
        <View style={styles.contentContainer}>
          <View style={styles.headerArea}>
            <Text style={styles.incomingLabel}>INCOMING CALL</Text>
            <Text style={styles.callerName}>{callerName}</Text>
            <Text style={styles.callerNumber}>{callerNumber}</Text>
          </View>

          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRippleOuter}>
              <View style={styles.avatarRippleInner}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {callerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.ringingFooter}>
            <View style={styles.callButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={declineCall}
              >
                <Text style={styles.btnIcon}>📞</Text>
                <Text style={styles.btnLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={answerCall}
              >
                <Text style={[styles.btnIcon, styles.acceptIcon]}>📞</Text>
                <Text style={styles.btnLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Active Call View */}
      {state === 'active' && (
        <View style={styles.contentContainer}>
          <View style={styles.headerArea}>
            <Text style={styles.callerName}>{callerName}</Text>
            <Text style={styles.timerText}>{formatCallTime(activeDurationSec)}</Text>
          </View>

          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircleSmall}>
              <Text style={styles.avatarInitialSmall}>
                {callerName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Hermes Spoken Audio / TTS Transcript Box */}
          <View style={styles.ttsContainer}>
            <View style={styles.ttsHeader}>
              <Text style={styles.ttsPulse}>{isTtsSpeaking ? '🎙️ Hermes Speaking' : '🟢 Voice Channel Ready'}</Text>
            </View>
            <Text style={styles.ttsScript}>
              "{ttsTranscriptSoFar || (currentCall?.ttsScript ? 'Initializing voice channel...' : 'Call connected.')}"
            </Text>
          </View>

          {/* In-Call Action Grid */}
          <View style={styles.inCallGrid}>
            <TouchableOpacity
              style={[styles.gridBtn, isMuted && styles.gridBtnActive]}
              onPress={toggleMute}
            >
              <Text style={styles.gridBtnIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
              <Text style={styles.gridBtnText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridBtn}>
              <Text style={styles.gridBtnIcon}>🔢</Text>
              <Text style={styles.gridBtnText}>Keypad</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridBtn, isSpeakerOn && styles.gridBtnActive]}
              onPress={toggleSpeaker}
            >
              <Text style={styles.gridBtnIcon}>🔊</Text>
              <Text style={styles.gridBtnText}>Speaker</Text>
            </TouchableOpacity>
          </View>

          {/* End Call Button */}
          <View style={styles.endCallContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionBtn, styles.declineBtn]}
              onPress={endActiveCall}
            >
              <Text style={styles.btnIcon}>📞</Text>
              <Text style={styles.btnLabel}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ended Call State */}
      {state === 'ended' && (
        <View style={[styles.contentContainer, styles.endedContainer]}>
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.endedLabel}>Call Ended</Text>
          <Text style={styles.timerText}>{formatCallTime(activeDurationSec)}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0B0F19',
    zIndex: 9999,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  headerArea: {
    alignItems: 'center',
    marginTop: 20,
  },
  incomingLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 8,
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  callerNumber: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 4,
  },
  timerText: {
    color: '#38BDF8',
    fontSize: 18,
    marginTop: 8,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  avatarRippleOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRippleInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  avatarInitial: {
    color: '#38BDF8',
    fontSize: 48,
    fontWeight: '700',
  },
  avatarCircleSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  avatarInitialSmall: {
    color: '#38BDF8',
    fontSize: 34,
    fontWeight: '700',
  },
  ttsContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ttsHeader: {
    marginBottom: 6,
  },
  ttsPulse: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ttsScript: {
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  inCallGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  gridBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBtnActive: {
    backgroundColor: '#38BDF8',
  },
  gridBtnIcon: {
    fontSize: 22,
  },
  gridBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  ringingFooter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  callButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  actionBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: '#EF4444',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  btnIcon: {
    fontSize: 30,
    color: '#FFFFFF',
    transform: [{ rotate: '135deg' }],
  },
  acceptIcon: {
    transform: [{ rotate: '0deg' }],
  },
  btnLabel: {
    position: 'absolute',
    bottom: -22,
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  endCallContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  endedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedLabel: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
});
