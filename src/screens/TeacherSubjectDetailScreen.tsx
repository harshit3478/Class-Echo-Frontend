import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
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

import { useAuth } from '../context/AuthContext';
import { getTeacherSubjectRecordings, uploadRecording } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingWithReport, RecordingStatus } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherSubjectDetail'>;

// ── Status helpers ────────────────────────────────────────────────────────────

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed': return { bg: '#E8F7EE', text: '#127A40', label: 'Done' };
    case 'processing': return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending': return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
    case 'failed': return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Recording Row ─────────────────────────────────────────────────────────────

function RecordingRow({
  recording,
  onPress,
}: {
  recording: RecordingWithReport;
  onPress: () => void;
}) {
  const s = statusStyle(recording.status);
  const hasReport = recording.status === 'completed' && recording.report;

  return (
    <Pressable onPress={hasReport ? onPress : undefined} style={styles.recordingRow}>
      {/* Icon */}
      <View style={[styles.recordingIcon, recording.status === 'processing' && styles.recordingIconProcessing]}>
        {recording.status === 'processing' ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Ionicons
            color={recording.status === 'completed' ? colors.accent : colors.textMuted}
            name={recording.status === 'completed' ? 'document-text' : 'mic-outline'}
            size={18}
          />
        )}
      </View>

      {/* Info */}
      <View style={styles.recordingInfo}>
        <Text style={styles.recordingTitle} numberOfLines={1}>
          {recording.chapter_name ?? `Recording #${recording.id}`}
        </Text>
        <View style={styles.recordingMeta}>
          <Ionicons color={colors.textMuted} name="calendar-outline" size={11} />
          <Text style={styles.recordingMetaText}>
            {new Date(recording.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          <Text style={styles.recordingMetaDot}>·</Text>
          <Ionicons color={colors.textMuted} name="time-outline" size={11} />
          <Text style={styles.recordingMetaText}>{formatDuration(recording.duration_seconds)}</Text>
        </View>
        {hasReport && recording.report?.overall_score != null ? (
          <Text style={styles.recordingScore}>
            Score: {recording.report.overall_score.toFixed(0)}%
          </Text>
        ) : null}
      </View>

      {/* Status + action */}
      <View style={styles.recordingRight}>
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
        </View>
        {hasReport ? (
          <Ionicons color={colors.accent} name="chevron-forward" size={16} />
        ) : null}
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function TeacherSubjectDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName } = route.params;

  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload metadata modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState<string>('audio/mpeg');
  const [chapterName, setChapterName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setRecordings(await getTeacherSubjectRecordings(session.token, subjectId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load recordings');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, subjectId],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  const handlePickFile = async () => {
    if (!session || uploading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPendingUri(asset.uri);
      setPendingMime(asset.mimeType ?? 'audio/mpeg');
      setChapterName('');
      setUploadDescription('');
      setShowUploadModal(true);
    } catch (e) {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const handleConfirmUpload = async () => {
    if (!session || !pendingUri || uploading) return;
    setShowUploadModal(false);
    setUploading(true);
    try {
      const newRecording = await uploadRecording(
        session.token,
        subjectId,
        pendingUri,
        pendingMime,
        chapterName.trim() || undefined,
        uploadDescription.trim() || undefined,
      );
      setRecordings((prev) => [newRecording, ...prev]);
    } catch (e) {
      Alert.alert(
        'Upload failed',
        e instanceof Error ? e.message : 'Could not upload recording. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setUploading(false);
      setPendingUri(null);
    }
  };

  const filtered = query.trim()
    ? recordings.filter((r) =>
        `Recording #${r.id} ${new Date(r.uploaded_at).toLocaleDateString()}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : recordings;

  const completedCount = recordings.filter((r) => r.status === 'completed').length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerBrand} numberOfLines={1}>{subjectName}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <View style={styles.pageHeading}>
          <Text style={styles.courseLabel}>COURSE MODULE</Text>
          <Text style={styles.pageTitle}>{subjectName}</Text>
          <Text style={styles.pageSubtitle}>
            Access all recorded lectures for this subject.
          </Text>
          {recordings.length > 0 ? (
            <View style={styles.countChip}>
              <Ionicons color={colors.textSecondary} name="calendar-outline" size={13} />
              <Text style={styles.countChipText}>{recordings.length} Recordings</Text>
            </View>
          ) : null}
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons color={colors.textMuted} name="search-outline" size={16} />
            <TextInput
              onChangeText={setQuery}
              placeholder="Search recordings…"
              placeholderTextColor={colors.textPlaceholder}
              style={styles.searchInput}
              value={query}
            />
            {query.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => setQuery('')}>
                <Ionicons color={colors.textMuted} name="close-circle" size={16} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Recordings list */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Loading recordings…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load recordings</Text>
            <Text style={styles.emptyBody}>{error}</Text>
          </View>
        ) : filtered.length === 0 && !query.trim() ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="mic-outline" size={44} />
            <Text style={styles.emptyTitle}>No recordings yet</Text>
            <Text style={styles.emptyBody}>Upload your first class recording below.</Text>
          </View>
        ) : (
          <View style={styles.recordingList}>
            {filtered.map((r) => (
              <RecordingRow
                key={r.id}
                recording={r}
                onPress={() =>
                  navigation.navigate('TeacherRecordingReport', {
                    recordingId: r.id,
                    subjectName,
                  })
                }
              />
            ))}
            {query.trim() && filtered.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>No results</Text>
                <Text style={styles.emptyBody}>Try a different search term.</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Stats strip (only when we have data) */}
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
      </ScrollView>

      {/* Upload recording button — fixed at bottom above safe area */}
      <View style={styles.uploadBar}>
        <Pressable
          disabled={uploading}
          onPress={handlePickFile}
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
        >
          {uploading ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadBtnText}>Uploading…</Text>
            </>
          ) : (
            <>
              <Ionicons color="#fff" name="cloud-upload-outline" size={20} />
              <Text style={styles.uploadBtnText}>Upload New Recording</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Upload metadata modal */}
      <Modal animationType="slide" onRequestClose={() => setShowUploadModal(false)} transparent visible={showUploadModal}>
        <Pressable onPress={() => setShowUploadModal(false)} style={styles.modalOverlay}>
          <Pressable style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Recording Details</Text>
            <Text style={styles.modalSubtitle}>Add chapter info before uploading.</Text>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>CHAPTER NAME (optional)</Text>
              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={setChapterName}
                placeholder="e.g. Chapter 3 — Photosynthesis"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.modalInput}
                value={chapterName}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>DESCRIPTION (optional)</Text>
              <TextInput
                autoCapitalize="sentences"
                multiline
                numberOfLines={3}
                onChangeText={setUploadDescription}
                placeholder="Brief description of this recording…"
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.modalInput, styles.modalInputMultiline]}
                value={uploadDescription}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowUploadModal(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirmUpload} style={styles.modalSubmitBtn}>
                <Ionicons color="#fff" name="cloud-upload-outline" size={16} />
                <Text style={styles.modalSubmitText}>Upload</Text>
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerBrand: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingBottom: 100, gap: 0 },

  pageHeading: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  courseLabel: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  pageTitle: { color: colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.75, lineHeight: 38 },
  pageSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  countChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

  searchRow: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15, padding: 0 },

  center: { alignItems: 'center', paddingVertical: 48, gap: 10, paddingHorizontal: 20 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  recordingList: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },

  // Recording row
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  recordingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIconProcessing: { backgroundColor: colors.accentSoft },
  recordingInfo: { flex: 1, gap: 4 },
  recordingTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  recordingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recordingMetaText: { color: colors.textMuted, fontSize: 11 },
  recordingMetaDot: { color: colors.textMuted, fontSize: 11 },
  recordingScore: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 2 },
  recordingRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 10 },

  // Upload bar
  uploadBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: colors.fab,
    paddingVertical: 16,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Upload metadata modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  modalField: { gap: 8 },
  modalFieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  modalInput: {
    height: 52, borderRadius: 12, backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16, fontSize: 15, color: colors.textPrimary,
  },
  modalInputMultiline: { height: 80, paddingTop: 14, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  modalSubmitBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.fab, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  modalSubmitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
