import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthInput } from '../components/AuthInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { createAdminSchool } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminCreateSchool'>;

export function AdminCreateSchoolScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    name.trim().length > 1 &&
    adminName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(adminEmail.trim()) &&
    adminPassword.length >= 6;

  const handleCreate = async () => {
    if (!session || !isValid) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const school = await createAdminSchool(session.token, {
        name: name.trim(),
        address: address.trim() || null,
        admin_name: adminName.trim(),
        admin_email: adminEmail.trim(),
        admin_password: adminPassword,
      });

      navigation.replace('AdminSchoolDetail', { schoolId: school.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create school');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
              <Feather color={colors.textPrimary} name="arrow-left" size={18} />
            </Pressable>
            <Text style={styles.topTitle}>Create school</Text>
            <View style={styles.iconButton} />
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>Register a new institution</Text>
            <Text style={styles.subtitle}>
              Create the school and provision its first school-admin account in one step.
            </Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              compactLabel={false}
              label="School Name"
              onChangeText={setName}
              placeholder="Green Valley Academy"
              value={name}
            />
            <AuthInput
              autoCapitalize="words"
              compactLabel={false}
              label="Address"
              onChangeText={setAddress}
              placeholder="1224 Meadow Lane, Springfield, IL"
              value={address}
            />
            <AuthInput
              autoCapitalize="words"
              compactLabel={false}
              label="Admin Name"
              onChangeText={setAdminName}
              placeholder="Principal Skinner"
              value={adminName}
            />
            <AuthInput
              autoComplete="email"
              compactLabel={false}
              keyboardType="email-address"
              label="Admin Email"
              onChangeText={setAdminEmail}
              placeholder="admin@school.edu"
              textContentType="emailAddress"
              value={adminEmail}
            />
            <AuthInput
              compactLabel={false}
              label="Temporary Password"
              onChangeText={setAdminPassword}
              placeholder="Minimum 6 characters"
              secureTextEntry
              showEye
              textContentType="password"
              value={adminPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              disabled={!isValid}
              label="Create School"
              loading={isSubmitting}
              onPress={handleCreate}
              showArrow={false}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: 22,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  hero: {
    gap: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.75,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 18,
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
