import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { getStudentSubjectRecordings } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingStatus, RecordingWithReport } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentSubjectDetail'>;

function statusConfig(status: RecordingStatus): { label: string; bg: string; color: string; icon: keyof typeof Ionicons.glyphMap } {
  switch (status) {
    case 'completed': return { label: 'Done', bg: '#E8F7EE', color: '#127A40', icon: 'checkmark-circle' };
    case 'processing': return { label: 'Processing', bg: '#FFF4E0', color: '#92400E', icon: 'hourglass-outline' };
    case 'pending': return { label: 'Pending', bg: colors.surfaceMuted, color: colors.textMuted, icon: 'time-outline' };
    case 'failed': return { label: 'Failed', bg: '#FEE2E2', color: '#B91C1C', icon: 'close-circle' };
  }
}

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function StudentSubjectDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName } = route.params;

  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    try {
      setError(null);
      setRecordings(await getStudentSubjectRecordings(session.token, subjectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recordings');
    }
  }

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [session, subjectId]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const done = recordings.filter((r) => r.status === 'completed').length;
  const pending = recordings.filter((r) => r.status === 'pending' || r.status === 'processing').length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>{subjectName}</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="alert-circle-outline" size={48} />
          <Text style={styles.emptyTitle}>Couldn't load recordings</Text>
          <Text style={styles.emptyBody}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Subject meta */}
              <View style={styles.subjectMeta}>
                <Text style={styles.metaKicker}>COURSE MODULE</Text>
                <Text style={styles.metaTitle}>{subjectName}</Text>
              </View>

              {/* Stats strip */}
              {recordings.length > 0 && (
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{recordings.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: '#22C55E' }]}>{done}</Text>
                    <Text style={styles.statLabel}>Analysed</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: colors.warning }]}>{pending}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                </View>
              )}

              <Text style={styles.sectionLabel}>Recordings</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = statusConfig(item.status);
            return (
              <View style={styles.recordingRow}>
                <View style={styles.recordingIcon}>
                  <Ionicons color={colors.accent} name="musical-note" size={18} />
                </View>
                <View style={styles.recordingInfo}>
                  <Text style={styles.recordingTitle}>Recording #{item.id}</Text>
                  <Text style={styles.recordingDate}>
                    {new Date(item.uploaded_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                    {item.duration_seconds ? `  ·  ${formatDuration(item.duration_seconds)}` : ''}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Ionicons color={cfg.color} name={cfg.icon} size={12} />
                  <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons color={colors.textMuted} name="film-outline" size={48} />
              <Text style={styles.emptyTitle}>No recordings yet</Text>
              <Text style={styles.emptyBody}>
                Your teacher hasn't uploaded any recordings for this subject yet.
              </Text>
            </View>
          }
        />
      )}
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },

  listContent: { padding: 20, gap: 10, flexGrow: 1 },
  listHeader: { gap: 16, marginBottom: 4 },

  subjectMeta: { gap: 4 },
  metaKicker: { fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 0.8 },
  metaTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },

  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  recordingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingInfo: { flex: 1, gap: 3 },
  recordingTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  recordingDate: { fontSize: 12, color: colors.textMuted },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusLabel: { fontSize: 11, fontWeight: '700' },

  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
