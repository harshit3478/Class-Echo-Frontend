import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { deleteAdminRecording, getAdminSubjectRecordings, getAdminSubjectStudents } from '../lib/api';
import { formatAudioTime } from '../lib/audio';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingStatus, RecordingWithReport, StudentOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSubjectDetail'>;

type DetailTab = 'recordings' | 'students';

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
  onDelete,
}: {
  recording: RecordingWithReport;
  onPress: () => void;
  onDelete: () => void;
}) {
  const status = statusStyle(recording.status);

  const handleDelete = () => {
    Alert.alert(
      'Delete Recording',
      `Delete "${recording.chapter_name ?? `Recording #${recording.id}`}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

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
        <Pressable hitSlop={8} onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons color="#B42318" name="trash-outline" size={16} />
        </Pressable>
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

export function AdminSubjectDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { schoolId, subjectId, subjectName } = route.params;

  const [activeTab, setActiveTab] = useState<DetailTab>('recordings');
  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
  const [students, setStudents] = useState<StudentOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          getAdminSubjectRecordings(session.token, schoolId, subjectId),
          getAdminSubjectStudents(session.token, schoolId, subjectId),
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
    [schoolId, session, subjectId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

  const handleDelete = useCallback(
    async (recordingId: number) => {
      if (!session) return;
      try {
        await deleteAdminRecording(session.token, recordingId);
        setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
      } catch {
        Alert.alert('Error', 'Could not delete recording. Please try again.');
      }
    },
    [session],
  );

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
          <Text style={styles.heroKicker}>SUBJECT INSIGHT</Text>
          <Text style={styles.heroTitle}>{subjectName}</Text>
          <Text style={styles.heroBody}>
            Super admin read-only view for recordings, analysis status, and enrolled students.
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
              <Text style={styles.emptyBody}>Teacher uploads for this subject will appear here.</Text>
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
                      onDelete={() => void handleDelete(recording.id)}
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
  deleteBtn: { padding: 4 },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 15, fontWeight: '800', color: colors.accentDark },
});
