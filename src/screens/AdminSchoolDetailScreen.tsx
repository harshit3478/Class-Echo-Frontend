import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { deleteAdminSchool, getAdminSchool, getAdminSchoolClasses, updateAdminSchool } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ClassOut, SchoolOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSchoolDetail'>;

function SchoolHero({ school }: { school: SchoolOut }) {
  const initials = school.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <View style={styles.hero}>
      <View style={styles.heroIconWrap}>
        <Text style={styles.heroInitials}>{initials}</Text>
      </View>
      <View style={styles.heroTextWrap}>
        <Text style={styles.institutionalLabel}>INSTITUTIONAL DETAIL</Text>
        <Text style={styles.heroName}>{school.name}</Text>
        {school.address ? (
          <View style={styles.heroAddrRow}>
            <Ionicons color={colors.textMuted} name="location-outline" size={14} />
            <Text style={styles.heroAddr}>{school.address}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AdminContact({ school }: { school: SchoolOut }) {
  if (!school.admin) {
    return (
      <View style={styles.adminCard}>
        <View style={styles.adminCardHeader}>
          <Ionicons color={colors.textMuted} name="person-circle-outline" size={20} />
          <Text style={styles.adminCardTitle}>Admin Contact</Text>
        </View>
        <View style={styles.adminEmptyRow}>
          <Ionicons color={colors.warning} name="warning-outline" size={16} />
          <Text style={styles.adminEmptyText}>No admin assigned to this school yet.</Text>
        </View>
        <Text style={styles.adminEmptyHint}>
          Edit the school profile to set up administrator credentials.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.adminCard}>
      <View style={styles.adminCardHeader}>
        <Ionicons color={colors.accent} name="person-circle-outline" size={20} />
        <Text style={styles.adminCardTitle}>Admin Contact</Text>
      </View>

      <View style={styles.adminProfile}>
        <View style={styles.adminAvatar}>
          <Text style={styles.adminAvatarText}>
            {school.admin.name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={styles.adminInfo}>
          <Text style={styles.adminName}>{school.admin.name}</Text>
          <Text style={styles.adminRole}>School Administrator</Text>
        </View>
      </View>

      <View style={styles.adminContactRow}>
        <View style={styles.adminContactItem}>
          <Ionicons color={colors.textMuted} name="mail-outline" size={15} />
          <Text style={styles.adminContactText} numberOfLines={1}>
            {school.admin.email}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ClassRow({
  classItem,
  index,
  onPress,
}: {
  classItem: ClassOut;
  index: number;
  onPress: () => void;
}) {
  const colors_ = ['#D1E4FF', '#E8F7EE', '#FFF4E0', '#F5F0FF', '#FFE8EC'];
  const textColors_ = ['#0061A3', '#127A40', '#92400E', '#6B21A8', '#9B1239'];
  const colorIdx = index % colors_.length;

  return (
    <Pressable onPress={onPress} style={styles.classRow}>
      <View style={[styles.classTag, { backgroundColor: colors_[colorIdx] }]}>
        <Text style={[styles.classTagText, { color: textColors_[colorIdx] }]}>
          {classItem.name.slice(0, 3).toUpperCase()}
        </Text>
      </View>
      <View style={styles.classInfo}>
        <Text style={styles.className}>{classItem.name}</Text>
        <Text style={styles.classDate}>
          Added {new Date(classItem.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
    </Pressable>
  );
}

export function AdminSchoolDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const [school, setSchool] = useState<SchoolOut | null>(null);
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const [schoolData, classesData] = await Promise.all([
        getAdminSchool(session.token, route.params.schoolId),
        getAdminSchoolClasses(session.token, route.params.schoolId),
      ]);
      setSchool(schoolData);
      setClasses(classesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load school');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [route.params.schoolId, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = () => {
    if (!school) return;
    setEditName(school.name);
    setEditAddress(school.address ?? '');
    setEditError(null);
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!session || !school) return;
    if (!editName.trim()) { setEditError('School name is required'); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateAdminSchool(session.token, school.id, {
        name: editName.trim(),
        address: editAddress.trim() || null,
      });
      setSchool(updated);
      setShowEdit(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = () => {
    if (!session || !school) return;
    Alert.alert(
      'Delete School',
      `Are you sure you want to delete "${school.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAdminSchool(session.token, school.id);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete school');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>School Profile</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={openEdit} style={styles.iconBtn}>
            <Ionicons color={colors.textPrimary} name="pencil-outline" size={20} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.iconBtn}>
            <Ionicons color="#EF4444" name="trash-outline" size={20} />
          </Pressable>
        </View>
      </View>

      {/* Edit School Modal */}
      <Modal animationType="slide" transparent visible={showEdit} onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit School</Text>
              <Pressable hitSlop={8} onPress={() => setShowEdit(false)}>
                <Ionicons color={colors.textMuted} name="close" size={22} />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>School Name *</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setEditName}
              placeholder="School name"
              placeholderTextColor={colors.textPlaceholder}
              style={styles.input}
              value={editName}
            />
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              autoCapitalize="sentences"
              multiline
              numberOfLines={2}
              onChangeText={setEditAddress}
              placeholder="School address (optional)"
              placeholderTextColor={colors.textPlaceholder}
              style={[styles.input, styles.inputMultiline]}
              value={editAddress}
            />
            {editError ? <Text style={styles.modalError}>{editError}</Text> : null}
            <Pressable
              disabled={editSaving}
              onPress={() => { void handleEditSave(); }}
              style={[styles.modalSaveBtn, editSaving && { opacity: 0.6 }]}
            >
              {editSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading school profile…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
          <Text style={styles.errorTitle}>Could not load school</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : school ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <SchoolHero school={school} />

          {/* Admin Contact */}
          <AdminContact school={school} />

          {/* Academic Units */}
          <View style={styles.unitsSection}>
            <View style={styles.unitsSectionHeader}>
              <Text style={styles.unitsSectionTitle}>Academic Units</Text>
              <Text style={styles.unitsSectionSub}>
                {classes.length > 0
                  ? `${classes.length} classes in this school`
                  : 'No classes added yet'}
              </Text>
            </View>

            {classes.length > 0 ? (
              <View style={styles.classTable}>
                {/* Table header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 1 }]}>CLASS NAME</Text>
                  <Text style={styles.tableHeaderText}>ADDED</Text>
                </View>

                {classes.map((classItem, idx) => (
                  <View key={classItem.id}>
                    {idx > 0 ? <View style={styles.rowDivider} /> : null}
                    <ClassRow
                      classItem={classItem}
                      index={idx}
                      onPress={() => navigation.navigate('AdminClassDetail', {
                        schoolId: route.params.schoolId,
                        classId: classItem.id,
                        className: classItem.name,
                        schoolName: school.name,
                      })}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyClasses}>
                <Ionicons color={colors.textMuted} name="school-outline" size={32} />
                <Text style={styles.emptyClassesText}>
                  No academic classes have been added to this school yet.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  scroll: {
    paddingBottom: 48,
    gap: 0,
  },

  // Hero
  hero: {
    backgroundColor: colors.surface,
    padding: 24,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    gap: 16,
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  heroInitials: {
    color: colors.accentDark,
    fontSize: 30,
    fontWeight: '800',
  },
  heroTextWrap: {
    alignItems: 'center',
    gap: 6,
  },
  institutionalLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 32,
  },
  heroAddrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  heroAddr: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    flex: 1,
  },

  // Admin contact
  adminCard: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  adminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  adminCardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  adminProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  adminAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    color: colors.accentDark,
    fontSize: 16,
    fontWeight: '800',
  },
  adminInfo: {
    flex: 1,
    gap: 3,
  },
  adminName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  adminRole: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  adminContactRow: {
    padding: 16,
    gap: 12,
  },
  adminContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminContactText: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  adminEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 4,
  },
  adminEmptyText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  adminEmptyHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Academic Units
  unitsSection: {
    margin: 20,
    gap: 12,
  },
  unitsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  unitsSectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  unitsSectionSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  classTable: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  tableHeaderText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  classTag: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  classInfo: {
    flex: 1,
    gap: 3,
  },
  className: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  classDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  emptyClasses: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyClassesText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: -8 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputMultiline: { height: 72, textAlignVertical: 'top' },
  modalError: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  modalSaveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
