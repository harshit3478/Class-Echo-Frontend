import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { uploadRecording } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherRecording'>;

type RecordState = 'idle' | 'recording' | 'stopped';

function padTwo(n: number) {
  return String(n).padStart(2, '0');
}

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${padTwo(h)}:${padTwo(m)}:${padTwo(s)}`;
  return `${padTwo(m)}:${padTwo(s)}`;
}

export function RecordingScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName } = route.params;

  const [state, setState] = useState<RecordState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [chapterName, setChapterName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordedUriRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission required', 'Microphone access is needed to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setElapsed(0);
      setState('recording');

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordedUriRef.current = uri;
      recordingRef.current = null;
      setState('stopped');
    } catch (e) {
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      recordingRef.current = null;
    }
    navigation.goBack();
  };

  const reRecord = async () => {
    recordedUriRef.current = null;
    setElapsed(0);
    setChapterName('');
    setDescription('');
    setState('idle');
  };

  const handleUpload = async () => {
    if (!session || !recordedUriRef.current || uploading) return;
    if (!chapterName.trim()) {
      Alert.alert('Chapter name required', 'Add a chapter name before uploading this recording.');
      return;
    }
    setUploading(true);
    try {
      await uploadRecording(
        session.token,
        subjectId,
        recordedUriRef.current,
        'audio/mp4',
        chapterName.trim() || undefined,
        description.trim() || undefined,
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        'Upload failed',
        e instanceof Error ? e.message : 'Could not upload recording.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          hitSlop={8}
          onPress={state === 'recording' ? cancelRecording : () => navigation.goBack()}
          style={styles.headerBack}
        >
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{subjectName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        {/* ── IDLE STATE ── */}
        {state === 'idle' && (
          <>
            <View style={styles.idleTop}>
              <View style={styles.micRing}>
                <Ionicons color={colors.accent} name="mic" size={52} />
              </View>
              <Text style={styles.idleTitle}>Record Class</Text>
              <Text style={styles.idleSubtitle}>
                Tap the button below to start recording your lecture.
              </Text>
            </View>
            <Pressable onPress={() => { void startRecording(); }} style={styles.recordBtn}>
              <Ionicons color="#fff" name="mic" size={24} />
              <Text style={styles.recordBtnText}>Start Recording</Text>
            </Pressable>
          </>
        )}

        {/* ── RECORDING STATE ── */}
        {state === 'recording' && (
          <>
            <View style={styles.recordingTop}>
              <View style={styles.pulseRing}>
                <View style={styles.pulseDot} />
              </View>
              <Text style={styles.liveLabel}>RECORDING</Text>
              <Text style={styles.timerText}>{formatTimer(elapsed)}</Text>
            </View>
            <View style={styles.recordingActions}>
              <Pressable onPress={cancelRecording} style={styles.cancelBtn}>
                <Ionicons color={colors.textSecondary} name="close" size={22} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { void stopRecording(); }} style={styles.stopBtn}>
                <View style={styles.stopIcon} />
                <Text style={styles.stopBtnText}>Stop</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── STOPPED STATE ── */}
        {state === 'stopped' && (
          <>
            <View style={styles.stoppedTop}>
              <View style={styles.doneCircle}>
                <Ionicons color="#127A40" name="checkmark" size={36} />
              </View>
              <Text style={styles.doneTitle}>Recording Complete</Text>
              <Text style={styles.doneDuration}>Duration: {formatTimer(elapsed)}</Text>
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>CHAPTER NAME *</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setChapterName}
                placeholder="e.g. Chapter 3 — Photosynthesis"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.metaInput}
                value={chapterName}
              />
              <Text style={[styles.metaLabel, { marginTop: 12 }]}>DESCRIPTION (optional)</Text>
              <TextInput
                autoCapitalize="sentences"
                multiline
                numberOfLines={3}
                onChangeText={setDescription}
                placeholder="Brief description of this recording…"
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.metaInput, styles.metaInputMultiline]}
                value={description}
              />
            </View>

            <View style={styles.stoppedActions}>
              <Pressable onPress={() => { void reRecord(); }} style={styles.reRecordBtn}>
                <Ionicons color={colors.textSecondary} name="refresh" size={18} />
                <Text style={styles.reRecordText}>Re-record</Text>
              </Pressable>
              <Pressable
                disabled={uploading || !chapterName.trim()}
                onPress={() => { void handleUpload(); }}
                style={[styles.uploadBtn, (uploading || !chapterName.trim()) && { opacity: 0.6 }]}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons color="#fff" name="cloud-upload-outline" size={20} />
                )}
                <Text style={styles.uploadBtnText}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  headerSpacer: { width: 36 },

  body: { flex: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'space-between' },

  // Idle
  idleTop: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  micRing: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  idleTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  idleSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.accent, borderRadius: 16, height: 56,
  },
  recordBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Recording
  recordingTop: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  pulseRing: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  pulseDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF4444' },
  liveLabel: { fontSize: 13, fontWeight: '800', color: '#EF4444', letterSpacing: 2 },
  timerText: { fontSize: 52, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 },
  recordingActions: { flexDirection: 'row', gap: 16 },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  stopBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 54, borderRadius: 14, backgroundColor: '#EF4444',
  },
  stopIcon: { width: 18, height: 18, borderRadius: 3, backgroundColor: '#fff' },
  stopBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Stopped
  stoppedTop: { alignItems: 'center', paddingTop: 40, gap: 10 },
  doneCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8F7EE',
    alignItems: 'center', justifyContent: 'center',
  },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  doneDuration: { fontSize: 14, color: colors.textSecondary },
  metaCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, gap: 8, marginTop: 24,
  },
  metaLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  metaInput: {
    height: 48, borderRadius: 12, backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary,
  },
  metaInputMultiline: { height: 72, paddingTop: 12, textAlignVertical: 'top' },
  stoppedActions: { flexDirection: 'row', gap: 14, marginTop: 20 },
  reRecordBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
  },
  reRecordText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  uploadBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 54, borderRadius: 14, backgroundColor: colors.accent,
  },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
