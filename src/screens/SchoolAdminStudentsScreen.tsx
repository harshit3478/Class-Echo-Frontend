import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SchoolAdminTabBar } from '../components/SchoolAdminTabBar';
import { useAuth } from '../context/AuthContext';
import { getSchoolAdminStudents } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { StudentWithClassOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminStudents'>;

const CLASS_COLORS = [
  { bg: '#D1E4FF', text: colors.accentDark },
  { bg: '#E8F7EE', text: '#127A40' },
  { bg: '#FFF4E0', text: '#92400E' },
  { bg: '#F5F0FF', text: '#6B21A8' },
  { bg: '#FFE8EC', text: '#9B1239' },
];

function getClassColorIdx(classId: number) {
  return classId % CLASS_COLORS.length;
}

export function SchoolAdminStudentsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [students, setStudents] = useState<StudentWithClassOut[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setStudents(await getSchoolAdminStudents(session.token));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load students');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  const filtered = query.trim()
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.email.toLowerCase().includes(query.toLowerCase()),
      )
    : students;

  // Group by class_name
  const grouped: { className: string; classId: number; students: StudentWithClassOut[] }[] = [];
  for (const s of filtered) {
    const existing = grouped.find((g) => g.classId === s.class_id);
    if (existing) {
      existing.students.push(s);
    } else {
      grouped.push({ className: s.class_name, classId: s.class_id, students: [s] });
    }
  }
  grouped.sort((a, b) => a.className.localeCompare(b.className));

  const handleTabPress = (key: string) => {
    if (key === 'classes') navigation.navigate('SchoolAdminClasses');
    if (key === 'teachers') navigation.navigate('SchoolAdminTeachers');
    if (key === 'profile') navigation.navigate('SchoolAdminProfile');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>EduAdmin</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate('SchoolAdminProfile')} style={styles.avatarCircle}>
            <Ionicons color={colors.accent} name="person" size={18} />
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons color={colors.textMuted} name="search-outline" size={16} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Search students…"
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

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading students…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="alert-circle-outline" size={48} />
          <Text style={styles.emptyTitle}>Could not load students</Text>
          <Text style={styles.emptyBody}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => String(item.classId)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.listHeaderWrap}>
              <Text style={styles.pageTitle}>Students</Text>
              <Text style={styles.pageSubtitle}>
                {students.length} enrolled across {grouped.length} class{grouped.length !== 1 ? 'es' : ''}
              </Text>
            </View>
          }
          renderItem={({ item: group }) => {
            const c = CLASS_COLORS[getClassColorIdx(group.classId)];
            return (
              <View style={styles.classGroup}>
                <View style={[styles.classHeader, { backgroundColor: c.bg }]}>
                  <Ionicons color={c.text} name="school-outline" size={14} />
                  <Text style={[styles.classHeaderText, { color: c.text }]}>{group.className}</Text>
                  <Text style={[styles.classCount, { color: c.text }]}>{group.students.length}</Text>
                </View>
                {group.students.map((student) => {
                  const initials = student.name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
                  return (
                    <View key={student.id} style={styles.studentRow}>
                      <View style={styles.studentAvatar}>
                        <Text style={styles.studentAvatarText}>{initials}</Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.studentEmail}>{student.email}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons color={colors.textMuted} name="people-outline" size={48} />
              <Text style={styles.emptyTitle}>No students yet</Text>
              <Text style={styles.emptyBody}>
                Students will appear here once they sign up and enroll in a class.
              </Text>
            </View>
          }
        />
      )}

      <SchoolAdminTabBar active="students" onTabPress={handleTabPress} />
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
  headerTitle: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  headerRight: { width: 40, alignItems: 'flex-end' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  listContent: { padding: 20, gap: 16, flexGrow: 1 },
  listHeaderWrap: { gap: 4, marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: colors.textSecondary },
  classGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  classHeaderText: { flex: 1, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  classCount: { fontSize: 12, fontWeight: '700' },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  studentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  studentInfo: { flex: 1, gap: 2 },
  studentName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  studentEmail: { fontSize: 12, color: colors.textMuted },
});
