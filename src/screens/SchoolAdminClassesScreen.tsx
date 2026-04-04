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
import {
  createSchoolAdminClass,
  getSchoolAdminClasses,
  getSchoolAdminTeachers,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ClassOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminClasses'>;

// Cycling accent colors for class cards
const CLASS_COLORS = [
  { bg: '#D1E4FF', text: colors.accentDark },
  { bg: '#E8F7EE', text: '#127A40' },
  { bg: '#FFF4E0', text: '#92400E' },
  { bg: '#F5F0FF', text: '#6B21A8' },
  { bg: '#FFE8EC', text: '#9B1239' },
];

function ClassCard({
  classItem,
  colorIdx,
  onPress,
}: {
  classItem: ClassOut;
  colorIdx: number;
  onPress: () => void;
}) {
  const c = CLASS_COLORS[colorIdx % CLASS_COLORS.length];
  const initials = classItem.name.slice(0, 2).toUpperCase();

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.cardIcon, { backgroundColor: c.bg }]}>
          <Text style={[styles.cardIconText, { color: c.text }]}>{initials}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{classItem.name}</Text>
          <Text style={styles.cardDate}>
            Added {new Date(classItem.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

function CreateClassModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (c: ClassOut) => void;
}) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 1;

  const handleCreate = async () => {
    if (!session || !canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const cls = await createSchoolAdminClass(session.token, { name: name.trim() });
      setName('');
      onCreated(cls);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={visible}>
      <Pressable onPress={handleClose} style={styles.modalOverlay}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Create New Class</Text>
          <Text style={styles.modalSubtitle}>
            Add a class to your school. You can assign subjects and teachers after.
          </Text>

          <View style={styles.modalField}>
            <Text style={styles.modalFieldLabel}>CLASS NAME</Text>
            <TextInput
              autoCapitalize="words"
              autoFocus
              onChangeText={setName}
              onSubmitEditing={handleCreate}
              placeholder="e.g. Class 10B"
              placeholderTextColor={colors.textPlaceholder}
              returnKeyType="done"
              style={styles.modalInput}
              value={name}
            />
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
                <Text style={styles.modalSubmitText}>Create Class</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SchoolAdminClassesScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setClasses(await getSchoolAdminClasses(session.token));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load classes');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  const handleTabPress = (key: string) => {
    if (key === 'teachers') navigation.navigate('SchoolAdminTeachers');
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

      {/* Tab strip */}
      <View style={styles.tabStrip}>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>Classes</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('SchoolAdminTeachers')} style={styles.tabInactive}>
          <Text style={styles.tabInactiveText}>Teachers</Text>
        </Pressable>
        <View style={styles.tabSpacer} />
        <Pressable onPress={() => setShowCreate(true)} style={styles.tabAddBtn}>
          <Ionicons color="#fff" name="add" size={18} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>Academic Classes</Text>
          <Text style={styles.pageSubtitle}>
            Managing {classes.length} active classroom{classes.length !== 1 ? 's' : ''} for the current session.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Loading classes…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load classes</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="school-outline" size={44} />
            <Text style={styles.emptyTitle}>No classes yet</Text>
            <Text style={styles.emptyBody}>Create your first class to start organizing subjects.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {classes.map((cls, idx) => (
              <ClassCard
                key={cls.id}
                classItem={cls}
                colorIdx={idx}
                onPress={() => navigation.navigate('SchoolAdminClassDetail', { classId: cls.id, className: cls.name })}
              />
            ))}
          </View>
        )}

        {/* Create New Class button */}
        <Pressable onPress={() => setShowCreate(true)} style={styles.createBtn}>
          <View style={styles.createBtnInner}>
            <Ionicons color={colors.textMuted} name="add-circle-outline" size={20} />
            <Text style={styles.createBtnText}>Create New Class</Text>
          </View>
        </Pressable>
      </ScrollView>

      <SchoolAdminTabBar active="classes" onTabPress={handleTabPress} />

      <CreateClassModal
        onClose={() => setShowCreate(false)}
        onCreated={(cls) => setClasses((prev) => [...prev, cls])}
        visible={showCreate}
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
  tabStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  tabActive: {
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  tabActiveText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  tabInactive: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabInactiveText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabSpacer: { flex: 1 },
  tabAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
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
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  center: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
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
  list: { gap: 12 },
  // Class Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontSize: 16, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  cardDate: { color: colors.textMuted, fontSize: 12 },
  // Create button
  createBtn: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  createBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  createBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
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
  modalField: { gap: 8 },
  modalFieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalInput: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
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
