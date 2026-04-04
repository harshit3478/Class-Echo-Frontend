import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { getAdminClass, getAdminClassSubjects } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ClassOut, SubjectOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminClassDetail'>;

const SUBJECT_COLORS = [
  { bg: '#D1E4FF', text: colors.accentDark },
  { bg: '#E8F7EE', text: '#127A40' },
  { bg: '#FFF4E0', text: '#92400E' },
  { bg: '#F5F0FF', text: '#6B21A8' },
  { bg: '#FFE8EC', text: '#9B1239' },
];

function SubjectCard({
  subject,
  colorIdx,
  onPress,
}: {
  subject: SubjectOut;
  colorIdx: number;
  onPress: () => void;
}) {
  const color = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];

  return (
    <Pressable onPress={onPress} style={styles.subjectCard}>
      <View style={styles.subjectCardTop}>
        <View style={[styles.subjectIcon, { backgroundColor: color.bg }]}>
          <Text style={[styles.subjectIconText, { color: color.text }]}>
            {subject.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          <Text style={styles.subjectMeta}>
            {subject.teacher ? `Teacher: ${subject.teacher.name}` : 'No teacher assigned'}
          </Text>
        </View>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
      </View>
    </Pressable>
  );
}

export function AdminClassDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { schoolId, classId, className, schoolName } = route.params;

  const [classDetail, setClassDetail] = useState<ClassOut | null>(null);
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
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
        const [nextClass, nextSubjects] = await Promise.all([
          getAdminClass(session.token, schoolId, classId),
          getAdminClassSubjects(session.token, schoolId, classId),
        ]);
        setClassDetail(nextClass);
        setSubjects(nextSubjects);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load class details');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [classId, schoolId, session],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {classDetail?.name ?? className}
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
          <Text style={styles.heroKicker}>CLASS OVERVIEW</Text>
          <Text style={styles.heroTitle}>{classDetail?.name ?? className}</Text>
          <Text style={styles.heroBody}>
            Read-only academic view for {schoolName}. Open a subject to inspect recordings and students.
          </Text>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{subjects.length}</Text>
            <Text style={styles.statLabel}>SUBJECTS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {subjects.filter((subject) => subject.teacher_id != null).length}
            </Text>
            <Text style={styles.statLabel}>ASSIGNED</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.emptyBody}>Loading class details…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load class details</Text>
            <Text style={styles.emptyBody}>{error}</Text>
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="library-outline" size={40} />
            <Text style={styles.emptyTitle}>No subjects yet</Text>
            <Text style={styles.emptyBody}>This class does not have any subjects attached yet.</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Subjects</Text>
              <Text style={styles.sectionCount}>{subjects.length}</Text>
            </View>
            {subjects.map((subject, index) => (
              <SubjectCard
                key={subject.id}
                colorIdx={index}
                onPress={() => navigation.navigate('AdminSubjectDetail', {
                  schoolId,
                  subjectId: subject.id,
                  subjectName: subject.name,
                })}
                subject={subject}
              />
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
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  statDivider: { width: 1, backgroundColor: colors.border },
  center: { paddingHorizontal: 20, paddingVertical: 56, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyBody: { textAlign: 'center', fontSize: 14, lineHeight: 20, color: colors.textSecondary },
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
  subjectCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  subjectCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIconText: { fontSize: 16, fontWeight: '800' },
  subjectInfo: { flex: 1, gap: 4 },
  subjectName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  subjectMeta: { fontSize: 13, color: colors.textSecondary },
});
