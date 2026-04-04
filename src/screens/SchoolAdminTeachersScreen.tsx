import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
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

import { SchoolAdminTabBar } from '../components/SchoolAdminTabBar';
import { useAuth } from '../context/AuthContext';
import { createSchoolAdminTeacher, getSchoolAdminTeachers } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { TeacherOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminTeachers'>;

// ── Add Teacher Modal ────────────────────────────────────────────────────────

function AddTeacherModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (t: TeacherOut) => void;
}) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = name.trim().length > 1 && emailValid && password.length >= 6;

  const handleCreate = async () => {
    if (!session || !canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const teacher = await createSchoolAdminTeacher(session.token, {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setName(''); setEmail(''); setPassword('');
      onCreated(teacher);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName(''); setEmail(''); setPassword(''); setError(null);
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={visible}>
      <Pressable onPress={handleClose} style={styles.modalOverlay}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add New Faculty</Text>
          <Text style={styles.modalSubtitle}>
            Register a teacher and assign them to subjects from any class detail.
          </Text>

          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={setName}
                placeholder="Dr. Elena Rodriguez"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                value={name}
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="teacher@school.edu"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>TEMPORARY PASSWORD</Text>
              <View style={styles.passWrap}>
                <TextInput
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textPlaceholder}
                  secureTextEntry={!showPass}
                  style={[styles.input, { paddingRight: 40 }]}
                  textContentType="newPassword"
                  value={password}
                />
                <Pressable hitSlop={8} onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
                  <Ionicons color={colors.textMuted} name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} />
                </Pressable>
              </View>
            </View>
          </View>

          {error ? (
            <View style={styles.modalError}>
              <Ionicons color="#B42318" name="alert-circle-outline" size={14} />
              <Text style={styles.modalErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable onPress={handleClose} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!canSubmit || submitting}
              onPress={handleCreate}
              style={[styles.modalSubmitBtn, (!canSubmit || submitting) && styles.btnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Add Teacher</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Teacher Card ─────────────────────────────────────────────────────────────

function TeacherCard({ teacher }: { teacher: TeacherOut }) {
  const initials = teacher.name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{teacher.name}</Text>
          <Text style={styles.cardEmail}>{teacher.email}</Text>
        </View>
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardMeta}>
        <Ionicons color={colors.textMuted} name="calendar-outline" size={13} />
        <Text style={styles.cardMetaText}>
          Joined {new Date(teacher.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function SchoolAdminTeachersScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setTeachers(await getSchoolAdminTeachers(session.token));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load teachers');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  const filtered = teachers.filter((t) => {
    const hay = [t.name, t.email].join(' ').toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  const handleTabPress = (key: string) => {
    if (key === 'classes') navigation.navigate('SchoolAdminClasses');
    if (key === 'students') navigation.navigate('SchoolAdminStudents');
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>Teacher Directory</Text>
          <Text style={styles.pageSubtitle}>
            Manage faculty members and active teaching statuses.
          </Text>
          <Pressable onPress={() => setShowAdd(true)} style={styles.addTeacherBtn}>
            <Ionicons color="#fff" name="person-add" size={16} />
            <Text style={styles.addTeacherText}>Add Teacher</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons color={colors.textMuted} name="search-outline" size={16} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search by name, email…"
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

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Loading faculty…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load teachers</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="people-outline" size={44} />
            <Text style={styles.emptyTitle}>
              {query.trim() ? 'No matching faculty' : 'No teachers yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {query.trim() ? 'Try a different search.' : 'Add your first teacher to get started.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))}
          </View>
        )}

        {/* Add New Faculty bottom button */}
        <Pressable onPress={() => setShowAdd(true)} style={styles.addFacultyBtn}>
          <View style={styles.addFacultyInner}>
            <Ionicons color={colors.textMuted} name="add-circle-outline" size={20} />
            <Text style={styles.addFacultyText}>Add New Faculty</Text>
          </View>
        </Pressable>
      </ScrollView>

      <SchoolAdminTabBar active="teachers" onTabPress={handleTabPress} />

      <AddTeacherModal
        onClose={() => setShowAdd(false)}
        onCreated={(t) => setTeachers((prev) => [...prev, t])}
        visible={showAdd}
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
  headerTitle: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  headerRight: { width: 40, alignItems: 'flex-end' },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 20 },

  pageHeading: { gap: 8 },
  pageTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  addTeacherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  addTeacherText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15, padding: 0 },

  center: { alignItems: 'center', paddingVertical: 48, gap: 10 },
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
  list: { gap: 14 },

  // Teacher Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accentDark, fontSize: 16, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  cardEmail: { color: colors.textSecondary, fontSize: 13 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#E8F7EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  activeBadgeText: { color: '#127A40', fontSize: 11, fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: colors.border },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    paddingHorizontal: 16,
  },
  cardMetaText: { color: colors.textMuted, fontSize: 12 },

  // Add Faculty bottom button
  addFacultyBtn: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addFacultyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  addFacultyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  fields: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  field: { padding: 14, gap: 6 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 0 },
  input: { color: colors.textPrimary, fontSize: 15, padding: 0, minHeight: 24 },
  passWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalErrorText: { color: '#B42318', fontSize: 13, flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  modalSubmitBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  modalSubmitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
