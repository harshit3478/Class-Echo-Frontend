import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SchoolAdminTabBar } from '../components/SchoolAdminTabBar';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminProfile'>;

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons color={colors.accent} name={icon} size={16} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export function SchoolAdminProfileScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();

  // School admin profile data comes from the JWT token (name/email aren't in the token directly)
  // We show what's available and provide a sign-out button.
  // A dedicated GET /school/me endpoint would be the clean solution — for now show role info.
  const [isLoading] = useState(false);

  const handleTabPress = (key: string) => {
    if (key === 'classes') navigation.navigate('SchoolAdminClasses');
    if (key === 'teachers') navigation.navigate('SchoolAdminTeachers');
    if (key === 'students') navigation.navigate('SchoolAdminStudents');
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
        <SchoolAdminTabBar active="profile" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Ionicons color={colors.accentDark} name="shield-checkmark" size={36} />
          </View>
          <Text style={styles.displayName}>School Admin</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Administrator</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Session Info</Text>
          <InfoRow icon="key-outline" label="Role" value="School Administrator" />
          <View style={styles.divider} />
          <InfoRow icon="information-circle-outline" label="Note" value="Full profile editing coming soon." />
        </View>

        <Pressable onPress={signOut} style={styles.signOutBtn}>
          <Ionicons color="#EF4444" name="log-out-outline" size={20} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

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
  scroll: { paddingBottom: 32, gap: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  displayName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  roleBadge: { backgroundColor: colors.accentSoft, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: colors.accentDark },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 14,
  },
  cardHeading: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border },
  signOutBtn: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
