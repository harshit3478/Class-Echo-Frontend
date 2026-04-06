import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
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

import { AudioWaveform } from '../components/AudioWaveform';
import { useAuth } from '../context/AuthContext';
import { formatAudioTime, inferMimeTypeFromUri, normalizeMeteringValue } from '../lib/audio';
import { uploadRecording } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherRecording'>;

type RecordState = 'idle' | 'recording' | 'stopped';

const RECORDER_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

function safelyPausePlayer(player: { pause: () => void }) {
  try {
    player.pause();
  } catch {
    // The hook releases the player automatically on unmount.
  }
}

export function RecordingScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName } = route.params;

  const recorder = useAudioRecorder(RECORDER_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 120);
  const previewPlayer = useAudioPlayer(null, { updateInterval: 180 });
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  const [state, setState] = useState<RecordState>('idle');
  const [chapterName, setChapterName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [meterBars, setMeterBars] = useState<number[]>([]);

  useEffect(() => {
    if (state !== 'recording') {
      return;
    }

    setMeterBars((current) => [...current.slice(-35), normalizeMeteringValue(recorderState.metering)]);
  }, [recorderState.metering, state]);

  const previewBars = useMemo(() => {
    if (meterBars.length > 0) {
      return meterBars;
    }
    return Array.from({ length: 36 }, () => 0.22);
  }, [meterBars]);

  const previewProgress =
    previewStatus.duration > 0 ? Math.min(1, previewStatus.currentTime / previewStatus.duration) : 0;

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission required', 'Microphone access is needed to record audio.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      setMeterBars([]);
      setRecordedUri(null);
      setRecordedDuration(0);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('recording');
    } catch {
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const nextState = recorder.getStatus();
      const uri = nextState.url ?? recorder.uri;
      if (!uri) {
        throw new Error('Missing recording file');
      }
      setRecordedUri(uri);
      setRecordedDuration(nextState.durationMillis / 1000);
      try {
        previewPlayer.replace(uri);
      } catch {
        Alert.alert('Preview unavailable', 'The recording was saved, but preview could not be prepared.');
      }
      setState('stopped');
    } catch {
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const cancelRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      // ignore cleanup failures
    }
    navigation.goBack();
  };

  const reRecord = async () => {
    safelyPausePlayer(previewPlayer);
    if (previewStatus.duration > 0) {
      await previewPlayer.seekTo(0).catch(() => undefined);
    }
    setRecordedUri(null);
    setRecordedDuration(0);
    setMeterBars([]);
    setChapterName('');
    setDescription('');
    setState('idle');
  };

  const togglePreview = async () => {
    if (!recordedUri) {
      return;
    }

    if (previewStatus.playing) {
      safelyPausePlayer(previewPlayer);
      return;
    }

    if (previewStatus.duration > 0 && previewStatus.currentTime >= previewStatus.duration - 0.2) {
      await previewPlayer.seekTo(0).catch(() => undefined);
    }
    previewPlayer.play();
  };

  const handleUpload = async () => {
    if (!session || !recordedUri || uploading) {
      return;
    }
    if (!chapterName.trim()) {
      Alert.alert('Chapter name required', 'Add a chapter name before uploading this recording.');
      return;
    }

    setUploading(true);
    const resolvedMime = inferMimeTypeFromUri(recordedUri, 'audio/mp4');
    const uploadUri = recordedUri.startsWith('/') ? `file://${recordedUri}` : recordedUri;
    console.log('[recording] upload:start', {
      subjectId,
      subjectName,
      recordedUri,
      uploadUri,
      resolvedMime,
      chapterName: chapterName.trim(),
      hasDescription: Boolean(description.trim()),
    });
    try {
      await uploadRecording(
        session.token,
        subjectId,
        recordedUri,
        resolvedMime,
        chapterName.trim(),
        description.trim() || undefined,
      );
      console.log('[recording] upload:success', {
        subjectId,
        recordedUri,
      });
      navigation.goBack();
    } catch (e) {
      console.error('[recording] upload:failure', {
        subjectId,
        subjectName,
        recordedUri,
        resolvedMime,
        error: e,
      });
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload recording.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          hitSlop={8}
          onPress={state === 'recording' ? () => void cancelRecording() : () => navigation.goBack()}
          style={styles.headerBack}
        >
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{subjectName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        {state === 'idle' ? (
          <>
            <View style={styles.hero}>
              <View style={styles.micRing}>
                <Ionicons color={colors.accent} name="mic" size={52} />
              </View>
              <Text style={styles.idleTitle}>Start Classroom Recording</Text>
              <Text style={styles.idleSubtitle}>
                Record the session, review the audio, and upload it with the chapter details when you are ready.
              </Text>
            </View>
            <Pressable onPress={() => void startRecording()} style={styles.recordBtn}>
              <Ionicons color="#fff" name="mic" size={22} />
              <Text style={styles.recordBtnText}>Start Recording</Text>
            </Pressable>
          </>
        ) : null}

        {state === 'recording' ? (
          <>
            <View style={styles.recordingTop}>
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>RECORDING</Text>
              </View>
              <Text style={styles.timerText}>
                {formatAudioTime(recorderState.durationMillis / 1000)}
              </Text>
            </View>

            <View style={styles.waveformCard}>
              <AudioWaveform
                activeColor="#E53935"
                bars={previewBars}
                inactiveColor="#FAD4D4"
                progress={1}
              />
            </View>

            <View style={styles.recordingActions}>
              <Pressable onPress={() => void cancelRecording()} style={styles.cancelBtn}>
                <Ionicons color={colors.textSecondary} name="close" size={22} />
                <Text style={styles.cancelBtnText}>Discard</Text>
              </Pressable>
              <Pressable onPress={() => void stopRecording()} style={styles.stopBtn}>
                <View style={styles.stopIcon} />
                <Text style={styles.stopBtnText}>Stop</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {state === 'stopped' ? (
          <>
            <View style={styles.stoppedTop}>
              <View style={styles.doneCircle}>
                <Ionicons color="#127A40" name="checkmark" size={36} />
              </View>
              <Text style={styles.doneTitle}>Recording Ready</Text>
              <Text style={styles.doneDuration}>Length: {formatAudioTime(recordedDuration)}</Text>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewMeta}>
                  {formatAudioTime(previewStatus.currentTime)} / {formatAudioTime(previewStatus.duration || recordedDuration)}
                </Text>
              </View>
              <Pressable onPress={() => void togglePreview()} style={styles.previewButton}>
                <View style={styles.previewIcon}>
                  {!previewStatus.isLoaded ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Ionicons
                      color={colors.accent}
                      name={previewStatus.playing ? 'pause' : 'play'}
                      size={22}
                    />
                  )}
                </View>
                <View style={styles.previewTextWrap}>
                  <Text style={styles.previewTextTitle}>Review recording</Text>
                  <Text style={styles.previewTextBody}>
                    Play the recording once to confirm the audio is clear before uploading it.
                  </Text>
                </View>
              </Pressable>
              <AudioWaveform bars={previewBars} progress={previewProgress} />
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>CHAPTER NAME *</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setChapterName}
                placeholder="Enter chapter name"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                value={chapterName}
              />

              <Text style={styles.metaLabel}>DESCRIPTION</Text>
              <TextInput
                autoCapitalize="sentences"
                multiline
                numberOfLines={4}
                onChangeText={setDescription}
                placeholder="Optional summary or notes for this class"
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.input, styles.descriptionInput]}
                value={description}
              />
            </View>

            <View style={styles.footerActions}>
              <Pressable onPress={() => void reRecord()} style={styles.secondaryBtn}>
                <Ionicons color={colors.textSecondary} name="refresh-outline" size={18} />
                <Text style={styles.secondaryBtnText}>Record Again</Text>
              </Pressable>
              <Pressable
                disabled={!chapterName.trim() || uploading}
                onPress={() => void handleUpload()}
                style={[styles.primaryBtn, (!chapterName.trim() || uploading) && styles.btnDisabled]}
              >
                {uploading ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={styles.primaryBtnText}>{uploading ? 'Uploading…' : 'Upload'}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
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
  body: { flex: 1, padding: 20, gap: 18 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  micRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleTitle: { fontSize: 30, fontWeight: '800', color: colors.textPrimary },
  idleSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 18,
  },
  recordBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  recordingTop: { alignItems: 'center', gap: 10, marginTop: 16 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53935' },
  liveLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#E53935' },
  timerText: { fontSize: 38, fontWeight: '800', color: colors.textPrimary },
  waveformCard: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0D0D0',
    backgroundColor: '#FFF6F6',
  },
  recordingActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 16,
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  stopBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    backgroundColor: '#E53935',
    paddingVertical: 16,
  },
  stopIcon: { width: 14, height: 14, borderRadius: 4, backgroundColor: '#fff' },
  stopBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  stoppedTop: { alignItems: 'center', gap: 10 },
  doneCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  doneDuration: { fontSize: 14, color: colors.textSecondary },
  previewCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  previewTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  previewMeta: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextWrap: { flex: 1, gap: 3 },
  previewTextTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  previewTextBody: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  metaCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  metaLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  descriptionInput: { minHeight: 96, textAlignVertical: 'top' },
  footerActions: { flexDirection: 'row', gap: 12 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: colors.accent,
    paddingVertical: 15,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  btnDisabled: { opacity: 0.55 },
});
