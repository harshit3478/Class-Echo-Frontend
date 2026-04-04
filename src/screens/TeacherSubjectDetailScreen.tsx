import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioWaveform } from '../components/AudioWaveform';
import { useAuth } from '../context/AuthContext';
import { buildWaveformBars, formatAudioTime, inferMimeTypeFromUri, isAudioMimeType } from '../lib/audio';
import { getTeacherSubjectRecordings, getTeacherSubjectStudents, uploadRecording } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingStatus, RecordingWithReport, StudentOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherSubjectDetail'>;

type DetailTab = 'recordings' | 'students';

function safelyPausePlayer(player: { pause: () => void }) {
  try {
    player.pause();
  } catch {
    // The hook releases the player automatically on unmount.
  }
}

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed':
      return { bg: '#E8F7EE', text: '#127A40', label: 'Done' };
    case 'processing':
      return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending':
      return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
    case 'failed':
      return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

function RecordingRow({
  recording,
  onPress,
}: {
  recording: RecordingWithReport;
  onPress: () => void;
}) {
  const status = statusStyle(recording.status);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardIcon}>
        {recording.status === 'processing' ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Ionicons
            color={recording.status === 'completed' ? colors.accent : colors.textMuted}
            name={recording.status === 'completed' ? 'document-text-outline' : 'mic-outline'}
            size={18}
          />
        )}
      </View>
      <View style={styles.cardContent}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {recording.chapter_name ?? `Recording #${recording.id}`}
        </Text>
        <Text style={styles.cardMeta}>
          {new Date(recording.uploaded_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          {' · '}
          {formatAudioTime(recording.duration_seconds)}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
      </View>
    </Pressable>
  );
}

function StudentRow({ student }: { student: StudentOut }) {
  const initials = student.name
    .split(' ')
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>{initials}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {student.name}
        </Text>
        <Text numberOfLines={1} style={styles.cardMeta}>
          {student.email}
        </Text>
      </View>
    </View>
  );
}

export function TeacherSubjectDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName } = route.params;
  const previewPlayer = useAudioPlayer(null, { updateInterval: 180 });
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  const [activeTab, setActiveTab] = useState<DetailTab>('recordings');
  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
  const [students, setStudents] = useState<StudentOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState('audio/mpeg');
  const [chapterName, setChapterName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!session) {
        return;
      }
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const [recordingData, studentData] = await Promise.all([
          getTeacherSubjectRecordings(session.token, subjectId),
          getTeacherSubjectStudents(session.token, subjectId),
        ]);
        setRecordings(recordingData);
        setStudents(studentData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load subject details');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, subjectId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!showUploadModal || !pendingUri) {
      safelyPausePlayer(previewPlayer);
      return;
    }
    previewPlayer.replace(pendingUri);
  }, [pendingUri, previewPlayer, showUploadModal]);

  const groupedRecordings = useMemo(() => {
    const grouped = new Map<string, RecordingWithReport[]>();
    for (const recording of recordings) {
      const key = recording.chapter_name?.trim() || 'Untitled';
      const bucket = grouped.get(key) ?? [];
      bucket.push(recording);
      grouped.set(key, bucket);
    }
    return Array.from(grouped.entries()).map(([chapter, items]) => ({ chapter, items }));
  }, [recordings]);

  const completedCount = recordings.filter((recording) => recording.status === 'completed').length;
  const previewBars = useMemo(() => buildWaveformBars(pendingUri ?? subjectName), [pendingUri, subjectName]);
  const previewProgress =
    previewStatus.duration > 0 ? Math.min(1, previewStatus.currentTime / previewStatus.duration) : 0;

  const closeUploadModal = async () => {
    safelyPausePlayer(previewPlayer);
    if (previewStatus.duration > 0) {
      await previewPlayer.seekTo(0).catch(() => undefined);
    }
    setShowUploadModal(false);
    setPendingUri(null);
    setChapterName('');
    setDescription('');
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const resolvedMime = inferMimeTypeFromUri(asset.uri, asset.mimeType);
      if (!isAudioMimeType(resolvedMime)) {
        Alert.alert('Audio only', 'Please select an audio file such as MP3, WAV, M4A, OGG, AAC, or WebM.');
        return;
      }

      setPendingUri(asset.uri);
      setPendingMime(resolvedMime);
      setChapterName('');
      setDescription('');
      setShowActionSheet(false);
      setShowUploadModal(true);
    } catch {
      Alert.alert('Error', 'Could not open the file picker.');
    }
  };

  const handleUpload = async () => {
    if (!session || !pendingUri || !chapterName.trim() || uploading) {
      return;
    }

    setUploading(true);
    try {
      const recording = await uploadRecording(
        session.token,
        subjectId,
        pendingUri,
        pendingMime,
        chapterName.trim(),
        description.trim() || undefined,
      );
      setRecordings((current) => [recording, ...current]);
      await closeUploadModal();
      setActiveTab('recordings');
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload recording.');
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewToggle = async () => {
    if (!pendingUri) {
      return;
    }

    if (previewStatus.playing) {
      previewPlayer.pause();
      return;
    }

    if (previewStatus.duration > 0 && previewStatus.currentTime >= previewStatus.duration - 0.2) {
      await previewPlayer.seekTo(0).catch(() => undefined);
    }
    previewPlayer.play();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {subjectName}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={colors.accent}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>COURSE MODULE</Text>
          <Text style={styles.heroTitle}>{subjectName}</Text>
          <Text style={styles.heroBody}>
            Capture classroom audio, upload previous sessions, review your class list, and open each report in one place.
          </Text>
        </View>

        <View style={styles.tabBar}>
          {(['recordings', 'students'] as const).map((tab) => {
            const isActive = tab === activeTab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab === 'recordings' ? 'Recordings' : 'Students'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={() => setShowActionSheet(true)} style={styles.actionButton}>
            <Ionicons color="#fff" name="add-circle-outline" size={18} />
            <Text style={styles.actionButtonText}>Upload New Recording</Text>
          </Pressable>
        </View>

        {recordings.length > 0 ? (
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recordings.length}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#127A40' }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>ANALYSED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {recordings.length - completedCount}
              </Text>
              <Text style={styles.statLabel}>PENDING</Text>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.emptyBody}>Loading subject details…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load subject details</Text>
            <Text style={styles.emptyBody}>{error}</Text>
          </View>
        ) : activeTab === 'recordings' ? (
          groupedRecordings.length === 0 ? (
            <View style={styles.center}>
              <Ionicons color={colors.textMuted} name="mic-outline" size={40} />
              <Text style={styles.emptyTitle}>No recordings yet</Text>
              <Text style={styles.emptyBody}>Record or upload your first audio lesson below.</Text>
            </View>
          ) : (
            <View style={styles.sectionStack}>
              {groupedRecordings.map((group) => (
                <View key={group.chapter} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{group.chapter}</Text>
                    <Text style={styles.sectionCount}>{group.items.length}</Text>
                  </View>
                  {group.items.map((recording) => (
                    <RecordingRow
                      key={recording.id}
                      onPress={() => navigation.navigate('RecordingDetail', { recording, subjectName })}
                      recording={recording}
                    />
                  ))}
                </View>
              ))}
            </View>
          )
        ) : students.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="people-outline" size={40} />
            <Text style={styles.emptyTitle}>No students enrolled</Text>
            <Text style={styles.emptyBody}>Students in this class will appear here.</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Class Roster</Text>
              <Text style={styles.sectionCount}>{students.length}</Text>
            </View>
            {students.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setShowActionSheet(false)} transparent visible={showActionSheet}>
        <Pressable onPress={() => setShowActionSheet(false)} style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Recording</Text>
            <Text style={styles.sheetSubtitle}>Choose how you want to add an audio recording for this class.</Text>

            <Pressable
              onPress={() => {
                setShowActionSheet(false);
                navigation.navigate('TeacherRecording', { subjectId, subjectName });
              }}
              style={styles.sheetOption}
            >
              <View style={styles.sheetOptionIcon}>
                <Ionicons color={colors.accent} name="mic-outline" size={20} />
              </View>
              <View style={styles.sheetOptionBody}>
                <Text style={styles.sheetOptionTitle}>Record in App</Text>
                <Text style={styles.sheetOptionText}>Record the class now and review it before uploading.</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => void handlePickFile()} style={styles.sheetOption}>
              <View style={styles.sheetOptionIcon}>
                <Ionicons color={colors.accent} name="document-outline" size={20} />
              </View>
              <View style={styles.sheetOptionBody}>
                <Text style={styles.sheetOptionTitle}>Upload Audio File</Text>
                <Text style={styles.sheetOptionText}>Select an existing MP3, WAV, M4A, OGG, AAC, or WebM recording.</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => void closeUploadModal()} transparent visible={showUploadModal}>
        <Pressable onPress={() => void closeUploadModal()} style={styles.sheetOverlay}>
          <Pressable style={[styles.sheet, styles.uploadSheet]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Upload Audio Recording</Text>
            <Text style={styles.sheetSubtitle}>Add the chapter details, review the audio, then upload it for analysis.</Text>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewMeta}>
                  {formatAudioTime(previewStatus.currentTime)} / {formatAudioTime(previewStatus.duration)}
                </Text>
              </View>
              <Pressable onPress={() => void handlePreviewToggle()} style={styles.previewButton}>
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
                  <Text style={styles.previewTextTitle}>Review audio</Text>
                  <Text style={styles.previewTextBody}>Play the recording once before uploading it for processing.</Text>
                </View>
              </Pressable>
              <AudioWaveform bars={previewBars} progress={previewProgress} />
            </View>

            <Text style={styles.inputLabel}>CHAPTER NAME *</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setChapterName}
              placeholder="Enter chapter name"
              placeholderTextColor={colors.textPlaceholder}
              style={styles.input}
              value={chapterName}
            />

            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <TextInput
              autoCapitalize="sentences"
              multiline
              numberOfLines={4}
              onChangeText={setDescription}
              placeholder="Optional summary or notes for this recording"
              placeholderTextColor={colors.textPlaceholder}
              style={[styles.input, styles.descriptionInput]}
              value={description}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => void closeUploadModal()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!chapterName.trim() || uploading}
                onPress={() => void handleUpload()}
                style={[styles.primaryButton, (!chapterName.trim() || uploading) && styles.buttonDisabled]}
              >
                {uploading ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={styles.primaryButtonText}>{uploading ? 'Uploading…' : 'Upload'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  scroll: { paddingBottom: 40, gap: 16 },
  hero: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  heroKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.accent },
  heroTitle: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  heroBody: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  tabButtonActive: { backgroundColor: colors.surface },
  tabLabel: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  tabLabelActive: { color: colors.textPrimary },
  actionRow: { paddingHorizontal: 20 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.accent,
  },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  statDivider: { width: 1, backgroundColor: colors.border },
  center: { paddingHorizontal: 20, paddingVertical: 56, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyBody: { textAlign: 'center', fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  sectionStack: { paddingHorizontal: 20, gap: 16 },
  section: { paddingHorizontal: 20, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  sectionCount: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    textAlign: 'center',
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardMeta: { fontSize: 13, color: colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 15, fontWeight: '800', color: colors.accentDark },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 28, 0.32)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  uploadSheet: { gap: 12 },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  sheetSubtitle: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionBody: { flex: 1, gap: 4 },
  sheetOptionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sheetOptionText: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  previewCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    gap: 12,
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
    backgroundColor: colors.surface,
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
  inputLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textMuted },
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
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  buttonDisabled: { opacity: 0.55 },
});
