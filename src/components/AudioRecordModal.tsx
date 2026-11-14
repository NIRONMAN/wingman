import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSend: (durationSec: number) => void;
}

export const AudioRecordModal: React.FC<Props> = ({ visible, onCancel, onSend }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timer: any = null;
    if (visible) {
      setSeconds(0);
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.micIcon}>🎙️</Text>
          <Text style={styles.title}>Recording Voice Memo</Text>
          <Text style={styles.subtitle}>Hermes is listening...</Text>

          <View style={styles.waveContainer}>
            {[0.4, 0.8, 1.0, 0.6, 0.9, 0.3, 0.7].map((height, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: 12 + height * 28,
                    opacity: 0.6 + (i % 3) * 0.2,
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.timerText}>{formatTime(seconds)}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => onSend(Math.max(1, seconds))}
            >
              <Text style={styles.sendBtnText}>Send to Hermes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  micIcon: {
    fontSize: 42,
    marginBottom: 8,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginBottom: 16,
    gap: 6,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  timerText: {
    color: '#38BDF8',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 14,
  },
  sendBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
