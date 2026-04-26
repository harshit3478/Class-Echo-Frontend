import { useCallback, useMemo, useState } from 'react';
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

import { TeacherTabBar } from '../components/TeacherTabBar';
import { useAuth } from '../context/AuthContext';
import { getTeacherMe, getTeacherSubjects } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { SubjectOut, TeacherOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherSubjects'>;

const SUBJECT_COLORS = [
  { bg: '#D1E4FF', text: colors.accentDark, border: '#A8C8FF' },
  { bg: '#E8F7EE', text: '#127A40', border: '#A3D9B8' },
  { bg: '#FFF4E0', text: '#92400E', border: '#FBBF7A' },
  { bg: '#F5F0FF', text: '#6B21A8', border: '#D8C4F8' },
  { bg: '#FFE8EC', text: '#9B1239', border: '#F9A8BE' },
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
  const c = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Class label kicker */}
      <View style={styles.cardKickerRow}>
        <Text style={[styles.cardKicker, { color: c.text }]}>
          {subject.class_?.name ?? `CLASS ${subject.class_id}`}
        </Text>
      </View>

      {/* Subject name + arrow */}
      <View style={styles.cardNameRow}>
        <Text style={styles.cardName}>{subject.name}</Text>
        <View style={[styles.arrowBtn, { backgroundColor: c.bg, borderColor: c.border }]}>
          <Ionicons color={c.text} name="chevron-forward" size={16} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterItem}>
          <View style={styles.waveIcon}>
            <Ionicons color={colors.accent} name="pulse" size={14} />
          </View>
          <Text style={styles.cardFooterLabel}>RECORDINGS</Text>
        </View>
        {subject.teacher ? (
          <Text style={styles.cardTeacher} numberOfLines={1}>
            {subject.teacher.name}
          </Text>
        ) : null}
      </View>

      {/* Bottom accent bar */}
      <View style={[styles.cardAccentBar, { backgroundColor: c.bg }]} />
    </Pressable>
  );
}

type SubjectGroup = { className: string; subjects: SubjectOut[] };

export function TeacherSubjectsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
  const [teacher, setTeacher] = useState<TeacherOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedSubjects = useMemo<SubjectGroup[]>(() => {
    const map = new Map<string, SubjectOut[]>();
    for (const s of subjects) {
      const key = s.class_?.name ?? `Class ${s.class_id}`;
      const bucket = map.get(key) ?? [];
      bucket.push(s);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).map(([className, list]) => ({ className, subjects: list }));
  }, [subjects]);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [subs, me] = await Promise.all([
          getTeacherSubjects(session.token),
          getTeacherMe(session.token),
        ]);
        setSubjects(subs);
        setTeacher(me);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load subjects');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Teacher Hub</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate('TeacherProfile')} style={styles.avatarCircle}>
            <Ionicons color={colors.accent} name="person" size={18} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <View style={styles.pageHeading}>
          {teacher?.school_name ? (
            <Text style={styles.schoolKicker}>{teacher.school_name.toUpperCase()}</Text>
          ) : null}
          <Text style={styles.pageTitle}>My Subjects</Text>
          <Text style={styles.pageSubtitle}>
            Manage your assigned classes and track recordings.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Loading your subjects…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load subjects</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="book-outline" size={44} />
            <Text style={styles.emptyTitle}>No subjects assigned</Text>
            <Text style={styles.emptyBody}>
              Your school admin will assign subjects to you.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {groupedSubjects.map((group) => (
              <View key={group.className} style={styles.classGroup}>
                <Text style={styles.classGroupHeader}>{group.className}</Text>
                {group.subjects.map((subject, idx) => (
                  <SubjectCard
                    key={subject.id}
                    colorIdx={idx}
                    onPress={() =>
                      navigation.navigate('TeacherSubjectDetail', {
                        subjectId: subject.id,
                        subjectName: subject.name,
                      })
                    }
                    subject={subject}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TeacherTabBar
        active="home"
        onTabPress={(key) => {
          if (key === 'account') navigation.navigate('TeacherProfile');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  headerRight: { width: 40, alignItems: 'flex-end' },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 20,
  },
  pageHeading: { gap: 6 },
  schoolKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.accent,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.75,
  },
  pageSubtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  center: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },
  list: { gap: 24 },
  classGroup: { gap: 14 },
  classGroupHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },

  // Subject Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 20,
    gap: 14,
  },
  cardKickerRow: { flexDirection: 'row', alignItems: 'center' },
  cardKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
    lineHeight: 32,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waveIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardTeacher: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardAccentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
