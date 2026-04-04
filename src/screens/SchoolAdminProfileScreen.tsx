import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
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
  getSchoolAdminMe,
  updateSchoolAdminMe,
  uploadSchoolAdminProfileImage,
  uploadSchoolLogo,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { SchoolAdminProfileOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminProfile'>;

export function SchoolAdminProfileScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<SchoolAdminProfileOut | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftSchoolName, setDraftSchoolName] = useState('');
  const [draftSchoolAddress, setDraftSchoolAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const nextProfile = await getSchoolAdminMe(session.token);
      setProfile(nextProfile);
      setDraftName(nextProfile.name);
      setDraftSchoolName(nextProfile.school_name);
      setDraftSchoolAddress(nextProfile.school_address ?? '');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const initials = profile?.name
    ?.split(' ')
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'SA';

  const pickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
  };

  const handleAvatarUpload = async () => {
    if (!session || avatarUploading) return;
    try {
      const asset = await pickImage();
      if (!asset) return;
      setAvatarUploading(true);
      const updated = await uploadSchoolAdminProfileImage(session.token, asset.uri, asset.mimeType);
      setProfile(updated);
      setDraftName(updated.name);
      setDraftSchoolName(updated.school_name);
      setDraftSchoolAddress(updated.school_address ?? '');
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload image.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!session || logoUploading) return;
    try {
      const asset = await pickImage();
      if (!asset) return;
      setLogoUploading(true);
      await uploadSchoolLogo(session.token, asset.uri, asset.mimeType);
      await load();
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload logo.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!session || !draftName.trim() || !draftSchoolName.trim() || saving) return;
    try {
      setSaving(true);
      const updated = await updateSchoolAdminMe(session.token, {
        name: draftName.trim(),
        school_name: draftSchoolName.trim(),
        school_address: draftSchoolAddress.trim() || null,
      });
      setProfile(updated);
      setDraftName(updated.name);
      setDraftSchoolName(updated.school_name);
      setDraftSchoolAddress(updated.school_address ?? '');
      setEditing(false);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleTabPress = (key: string) => {
    if (key === 'classes') navigation.navigate('SchoolAdminClasses');
    if (key === 'teachers') navigation.navigate('SchoolAdminTeachers');
    if (key === 'students') navigation.navigate('SchoolAdminStudents');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Pressable onPress={() => void handleAvatarUpload()} style={styles.avatarWrap}>
              {profile?.profile_pic_url ? (
                <Image source={{ uri: profile.profile_pic_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                {avatarUploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons color="#fff" name="camera" size={14} />
                )}
              </View>
            </Pressable>
            <Text style={styles.roleBadge}>School Administrator</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Admin Details</Text>
              {editing ? (
                <Pressable
                  onPress={() => {
                    setEditing(false);
                    setDraftName(profile?.name ?? '');
                    setDraftSchoolName(profile?.school_name ?? '');
                    setDraftSchoolAddress(profile?.school_address ?? '');
                  }}
                >
                  <Text style={styles.linkText}>Cancel</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setEditing(true)}>
                  <Text style={styles.linkText}>Edit</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.label}>NAME</Text>
            {editing ? (
              <TextInput
                autoCapitalize="words"
                onChangeText={setDraftName}
                placeholder="Full name"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                value={draftName}
              />
            ) : (
              <Text style={styles.value}>{profile?.name ?? '—'}</Text>
            )}

            <Text style={styles.label}>EMAIL</Text>
            <Text style={styles.value}>{profile?.email ?? '—'}</Text>

            {editing ? (
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>School</Text>
              <Pressable onPress={() => void handleLogoUpload()}>
                <Text style={styles.linkText}>{logoUploading ? 'Uploading…' : 'Upload Logo'}</Text>
              </Pressable>
            </View>

            <View style={styles.logoRow}>
              {profile?.school_logo_url ? (
                <Image source={{ uri: profile.school_logo_url }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoFallback}>
                  <Ionicons color={colors.textMuted} name="image-outline" size={20} />
                </View>
              )}
              <View style={styles.logoInfo}>
                <Text style={styles.subtleValue}>Tap the action above to change the school logo.</Text>
              </View>
            </View>

            <Text style={styles.label}>SCHOOL NAME</Text>
            {editing ? (
              <TextInput
                autoCapitalize="words"
                onChangeText={setDraftSchoolName}
                placeholder="School name"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                value={draftSchoolName}
              />
            ) : (
              <Text style={styles.value}>{profile?.school_name ?? '—'}</Text>
            )}

            <Text style={styles.label}>ADDRESS</Text>
            {editing ? (
              <TextInput
                autoCapitalize="sentences"
                multiline
                numberOfLines={3}
                onChangeText={setDraftSchoolAddress}
                placeholder="School address"
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.input, styles.addressInput]}
                value={draftSchoolAddress}
              />
            ) : (
              <Text style={styles.subtleValue}>{profile?.school_address ?? 'No address added'}</Text>
            )}

            {editing ? (
              <Pressable
                disabled={saving || !draftName.trim() || !draftSchoolName.trim()}
                onPress={() => void handleSave()}
                style={[
                  styles.primaryButton,
                  (saving || !draftName.trim() || !draftSchoolName.trim()) && styles.buttonDisabled,
                ]}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={signOut} style={styles.signOutButton}>
            <Ionicons color="#EF4444" name="log-out-outline" size={18} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      )}

      <SchoolAdminTabBar active="profile" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 32, gap: 18 },
  hero: { alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatarImage: { width: 104, height: 104, borderRadius: 52 },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 34, fontWeight: '800', color: colors.accentDark },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    color: colors.accentDark,
    fontWeight: '700',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  linkText: { color: colors.accentDark, fontSize: 14, fontWeight: '700' },
  label: { fontSize: 11, letterSpacing: 1, color: colors.textMuted, fontWeight: '700', marginTop: 4 },
  value: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  subtleValue: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  addressInput: {
    minHeight: 92,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoImage: { width: 64, height: 64, borderRadius: 14 },
  logoFallback: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInfo: { flex: 1, gap: 4 },
  signOutButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});
