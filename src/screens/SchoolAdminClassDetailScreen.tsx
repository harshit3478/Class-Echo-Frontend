import { useCallback, useEffect, useState } from 'react';
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

import { useAuth } from '../context/AuthContext';
import {
  assignTeacherToSubject,
  createSubject,
  getClassSubjects,
  getSchoolAdminTeachers,
  updateSchoolAdminClass,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { SubjectOut, TeacherOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminClassDetail'>;

const SUBJECT_COLORS = [
  { bg: '#D1E4FF', text: colors.accentDark },
  { bg: '#E8F7EE', text: '#127A40' },
  { bg: '#FFF4E0', text: '#92400E' },
  { bg: '#F5F0FF', text: '#6B21A8' },
  { bg: '#FFE8EC', text: '#9B1239' },
];

// ── Add Subject Modal ────────────────────────────────────────────────────────

function AddSubjectModal({
  visible,
  classId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  classId: number;
  onClose: () => void;
  onCreated: (s: SubjectOut) => void;
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
      const subject = await createSubject(session.token, classId, { name: name.trim() });
      setName('');
      onCreated(subject);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => { setName(''); setError(null); onClose(); };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={visible}>
      <Pressable onPress={handleClose} style={styles.modalOverlay}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Subject</Text>
          <Text style={styles.modalSubtitle}>
            Add a new subject to this class. You can assign a teacher afterwards.
          </Text>

          <View style={styles.modalField}>
            <Text style={styles.modalFieldLabel}>SUBJECT NAME</Text>
            <TextInput
              autoCapitalize="words"
              autoFocus
              onChangeText={setName}
              onSubmitEditing={handleCreate}
              placeholder="e.g. Mathematics, Physics…"
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
                <Text style={styles.modalSubmitText}>Add Subject</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Assign Teacher Modal ──────────────────────────────────────────────────────

function AssignTeacherModal({
  visible,
  subject,
  teachers,
  onClose,
  onAssigned,
}: {
  visible: boolean;
  subject: SubjectOut | null;
  teachers: TeacherOut[];
  onClose: () => void;
  onAssigned: (updated: SubjectOut) => void;
}) {
  const { session } = useAuth();
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async (teacherId: number) => {
    if (!session || !subject || assigningId) return;
    setAssigningId(teacherId);
    setError(null);
    try {
      const updated = await assignTeacherToSubject(session.token, subject.id, teacherId);
      onAssigned(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign teacher');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Assign Teacher</Text>
          {subject ? (
            <Text style={styles.modalSubtitle}>
              Assign a faculty member to <Text style={{ fontWeight: '700' }}>{subject.name}</Text>.
            </Text>
          ) : null}

          {error ? (
            <View style={styles.modalError}>
              <Ionicons color="#B42318" name="alert-circle-outline" size={14} />
              <Text style={styles.modalErrorText}>{error}</Text>
            </View>
          ) : null}

          {teachers.length === 0 ? (
            <View style={styles.noTeachersBox}>
              <Ionicons color={colors.textMuted} name="people-outline" size={32} />
              <Text style={styles.noTeachersText}>
                No teachers available. Add faculty from the Teachers tab first.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.teacherList} showsVerticalScrollIndicator={false}>
              {teachers.map((teacher) => {
                const isCurrentTeacher = subject?.teacher_id === teacher.id;
                const isAssigning = assigningId === teacher.id;
                const initials = teacher.name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
                return (
                  <Pressable
                    key={teacher.id}
                    onPress={() => handleAssign(teacher.id)}
                    style={[styles.teacherRow, isCurrentTeacher && styles.teacherRowActive]}
                  >
                    <View style={[styles.teacherAvatar, isCurrentTeacher && styles.teacherAvatarActive]}>
                      <Text style={[styles.teacherAvatarText, isCurrentTeacher && styles.teacherAvatarTextActive]}>
                        {initials}
                      </Text>
                    </View>
                    <View style={styles.teacherInfo}>
                      <Text style={styles.teacherName}>{teacher.name}</Text>
                      <Text style={styles.teacherEmail}>{teacher.email}</Text>
                    </View>
                    {isAssigning ? (
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : isCurrentTeacher ? (
                      <Ionicons color={colors.accent} name="checkmark-circle" size={20} />
                    ) : (
                      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Subject Card ─────────────────────────────────────────────────────────────

function SubjectCard({
  subject,
  colorIdx,
  onAssignPress,
  onCardPress,
}: {
  subject: SubjectOut;
  colorIdx: number;
  onAssignPress: () => void;
  onCardPress: () => void;
}) {
  const c = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
  const nameLetters = subject.name.slice(0, 1).toUpperCase();

  return (
    <Pressable onPress={onCardPress} style={styles.subjectCard}>
      <View style={styles.subjectCardTop}>
        <View style={[styles.subjectIcon, { backgroundColor: c.bg }]}>
          <Text style={[styles.subjectIconText, { color: c.text }]}>{nameLetters}</Text>
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          <Text style={styles.subjectMeta}>
            Added {new Date(subject.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      <View style={styles.subjectCardDivider} />

      <View style={styles.subjectTeacherRow}>
        {subject.teacher ? (
          <>
            <View style={styles.assignedTeacherChip}>
              <View style={styles.miniAvatar}>
                <Text style={styles.miniAvatarText}>
                  {subject.teacher.name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <Text style={styles.assignedTeacherText} numberOfLines={1}>
                {subject.teacher.name}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.unassignedChip}>
            <Ionicons color={colors.textMuted} name="person-outline" size={13} />
            <Text style={styles.unassignedText}>No teacher assigned</Text>
          </View>
        )}
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onAssignPress(); }}
          style={styles.assignBtn}
        >
          <Ionicons color={colors.accent} name="swap-horizontal" size={14} />
          <Text style={styles.assignBtnText}>{subject.teacher ? 'Change' : 'Assign'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function SchoolAdminClassDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { classId, className } = route.params;

  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [assignTarget, setAssignTarget] = useState<SubjectOut | null>(null);
  const [showEditClass, setShowEditClass] = useState(false);
  const [editClassName, setEditClassName] = useState(className);
  const [editingClass, setEditingClass] = useState(false);
  const [editClassError, setEditClassError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [subjectsData, teachersData] = await Promise.all([
          getClassSubjects(session.token, classId),
          getSchoolAdminTeachers(session.token),
        ]);
        setSubjects(subjectsData);
        setTeachers(teachersData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load class data');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, classId],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  const handleEditClassSave = async () => {
    if (!session || !editClassName.trim() || editingClass) return;
    setEditingClass(true);
    setEditClassError(null);
    try {
      await updateSchoolAdminClass(session.token, classId, { name: editClassName.trim() });
      await load(true);
      setShowEditClass(false);
      navigation.setParams({ className: editClassName.trim() } as never);
    } catch (e) {
      setEditClassError(e instanceof Error ? e.message : 'Failed to update class');
    } finally {
      setEditingClass(false);
    }
  };

  const handleSubjectCreated = (s: SubjectOut) => setSubjects((prev) => [...prev, s]);

  const handleTeacherAssigned = (updated: SubjectOut) => {
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setAssignTarget(null);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{className}</Text>
        <View style={styles.headerRight}>
          <View style={styles.avatarCircle}>
            <Ionicons color={colors.accent} name="person" size={16} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <View style={styles.pageHeading}>
          <Text style={styles.academicLabel}>CURRENT SESSION</Text>
          <Text style={styles.pageTitle}>Curriculum Overview</Text>
          <View style={styles.headingActions}>
            <Pressable onPress={() => { setEditClassName(className); setEditClassError(null); setShowEditClass(true); }} style={styles.editClassBtn}>
              <Ionicons color={colors.textSecondary} name="create-outline" size={14} />
              <Text style={styles.editClassText}>Edit Class</Text>
            </Pressable>
            <Pressable onPress={() => setShowAddSubject(true)} style={styles.addSubjectBtn}>
              <Ionicons color="#fff" name="add" size={14} />
              <Text style={styles.addSubjectText}>Add Subject</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{subjects.length}</Text>
            <Text style={styles.statLabel}>SUBJECTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {subjects.filter((s) => s.teacher_id !== null).length}
            </Text>
            <Text style={styles.statLabel}>ASSIGNED</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, subjects.filter((s) => !s.teacher_id).length > 0 && styles.statValueWarn]}>
              {subjects.filter((s) => !s.teacher_id).length}
            </Text>
            <Text style={styles.statLabel}>UNASSIGNED</Text>
          </View>
        </View>

        {/* Subjects section */}
        <View style={styles.subjectsSection}>
          <Text style={styles.sectionTitle}>Departmental Subjects</Text>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.loadingText}>Loading subjects…</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
              <Text style={styles.emptyTitle}>Could not load subjects</Text>
              <Text style={styles.emptyBody}>{error}</Text>
            </View>
          ) : subjects.length === 0 ? (
            <View style={styles.center}>
              <Ionicons color={colors.textMuted} name="book-outline" size={40} />
              <Text style={styles.emptyTitle}>No subjects yet</Text>
              <Text style={styles.emptyBody}>Add the first subject to this class.</Text>
            </View>
          ) : (
            <View style={styles.subjectList}>
              {subjects.map((subject, idx) => (
                <SubjectCard
                  key={subject.id}
                  colorIdx={idx}
                  onAssignPress={() => setAssignTarget(subject)}
                  onCardPress={() =>
                    navigation.navigate('SchoolAdminSubjectDetail', {
                      subjectId: subject.id,
                      subjectName: subject.name,
                    })
                  }
                  subject={subject}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <AddSubjectModal
        classId={classId}
        onClose={() => setShowAddSubject(false)}
        onCreated={handleSubjectCreated}
        visible={showAddSubject}
      />

      <AssignTeacherModal
        onAssigned={handleTeacherAssigned}
        onClose={() => setAssignTarget(null)}
        subject={assignTarget}
        teachers={teachers}
        visible={assignTarget !== null}
      />

      {/* Edit Class Modal */}
      <Modal animationType="slide" onRequestClose={() => setShowEditClass(false)} transparent visible={showEditClass}>
        <Pressable onPress={() => setShowEditClass(false)} style={styles.modalOverlay}>
          <Pressable style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Class</Text>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>CLASS NAME</Text>
              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={setEditClassName}
                onSubmitEditing={handleEditClassSave}
                placeholder="e.g. Class 10B"
                placeholderTextColor={colors.textPlaceholder}
                returnKeyType="done"
                style={styles.modalInput}
                value={editClassName}
              />
            </View>
            {editClassError ? (
              <View style={styles.modalError}>
                <Ionicons color="#B42318" name="alert-circle-outline" size={14} />
                <Text style={styles.modalErrorText}>{editClassError}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowEditClass(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!editClassName.trim() || editingClass}
                onPress={handleEditClassSave}
                style={[styles.modalSubmitBtn, (!editClassName.trim() || editingClass) && styles.btnDisabled]}
              >
                {editingClass ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save</Text>
                )}
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
  headerTitle: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36, alignItems: 'flex-end' },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingBottom: 48, gap: 0 },

  // Page heading
  pageHeading: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  academicLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headingActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editClassText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  addSubjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addSubjectText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 1,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  statValueWarn: { color: colors.warning },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Subjects section
  subjectsSection: { paddingHorizontal: 20, gap: 14 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  subjectList: { gap: 14 },

  // Subject Card
  subjectCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  subjectCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIconText: { fontSize: 18, fontWeight: '800' },
  subjectInfo: { flex: 1, gap: 4 },
  subjectName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  subjectMeta: { color: colors.textMuted, fontSize: 12 },
  subjectCardDivider: { height: 1, backgroundColor: colors.border },
  subjectTeacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 10,
  },
  assignedTeacherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: { color: colors.accentDark, fontSize: 10, fontWeight: '800' },
  assignedTeacherText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', flex: 1 },
  unassignedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  unassignedText: { color: colors.textMuted, fontSize: 13 },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.accentSoft,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  assignBtnText: { color: colors.accent, fontSize: 12, fontWeight: '700' },

  // Shared states
  center: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    maxHeight: '80%',
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

  // Teacher list in assign modal
  teacherList: { maxHeight: 300 },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teacherRowActive: { backgroundColor: colors.accentSoft + '55', borderRadius: 12 },
  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherAvatarActive: { backgroundColor: colors.accentSoft },
  teacherAvatarText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  teacherAvatarTextActive: { color: colors.accentDark },
  teacherInfo: { flex: 1, gap: 2 },
  teacherName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  teacherEmail: { color: colors.textMuted, fontSize: 12 },
  noTeachersBox: { alignItems: 'center', padding: 24, gap: 10 },
  noTeachersText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
