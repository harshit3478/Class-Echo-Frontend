import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { createAdminSchool } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminCreateSchool'>;

function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionLabelText}>{children}</Text>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
  multiline,
  hint,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  textContentType?: React.ComponentProps<typeof TextInput>['textContentType'];
  multiline?: boolean;
  hint?: string;
  suffix?: React.ReactNode;
}) {
  const [showPass, setShowPass] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          secureTextEntry={secureTextEntry && !showPass}
          style={[styles.input, multiline && styles.inputMultiline]}
          textContentType={textContentType}
          value={value}
        />
        {secureTextEntry ? (
          <Pressable
            hitSlop={8}
            onPress={() => setShowPass((v) => !v)}
            style={styles.eyeBtn}
          >
            <Ionicons
              color={colors.textMuted}
              name={showPass ? 'eye-off-outline' : 'eye-outline'}
              size={18}
            />
          </Pressable>
        ) : suffix ? (
          <View style={styles.eyeBtn}>{suffix}</View>
        ) : null}
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function AdminCreateSchoolScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(adminEmail.trim());
  const isValid =
    name.trim().length > 1 &&
    adminName.trim().length > 1 &&
    emailValid &&
    adminPassword.length >= 6;

  const handleCreate = async () => {
    if (!session || !isValid || isSubmitting) return;
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
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Ionicons color={colors.textMuted} name="grid-outline" size={12} />
          <Text style={styles.breadcrumb}>DISTRICT MANAGEMENT</Text>
        </View>
        <Text style={styles.topTitle}>Configuration</Text>
        <View style={styles.topActions}>
          <Pressable
            disabled={isSubmitting}
            onPress={() => navigation.goBack()}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            disabled={!isValid || isSubmitting}
            onPress={handleCreate}
            style={[styles.saveBtn, (!isValid || isSubmitting) && styles.saveBtnDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save School</Text>
            )}
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* School Details */}
          <View style={styles.section}>
            <SectionLabel>School Details</SectionLabel>
            <View style={styles.sectionCard}>
              <FormField
                label="School Name"
                onChangeText={setName}
                placeholder="e.g. Oakridge Academy"
                value={name}
              />
              <View style={styles.fieldDivider} />
              <FormField
                autoCapitalize="sentences"
                label="Physical Address"
                multiline
                onChangeText={setAddress}
                placeholder="Enter the full street address, city, and postal code..."
                value={address}
              />
            </View>
          </View>

          {/* Initial School Admin */}
          <View style={styles.section}>
            <SectionLabel>Initial School Admin</SectionLabel>
            <Text style={styles.sectionHint}>
              These credentials will be sent to the school representative for first-time login.
            </Text>
            <View style={styles.sectionCard}>
              <FormField
                autoCapitalize="words"
                label="Admin Full Name"
                onChangeText={setAdminName}
                placeholder="e.g. Dr. Elena Rodriguez"
                value={adminName}
              />
              <View style={styles.fieldDivider} />
              <FormField
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Admin Email"
                onChangeText={setAdminEmail}
                placeholder="admin@school.edu"
                suffix={
                  <Ionicons
                    color={emailValid && adminEmail.length > 0 ? colors.success : colors.textMuted}
                    name={emailValid && adminEmail.length > 0 ? 'checkmark-circle' : 'mail-outline'}
                    size={18}
                  />
                }
                textContentType="emailAddress"
                value={adminEmail}
              />
              <View style={styles.fieldDivider} />
              <FormField
                hint="Minimum 6 characters. Admin should change this on first login."
                label="Temporary Password"
                onChangeText={setAdminPassword}
                placeholder="Set a temporary password"
                secureTextEntry
                textContentType="newPassword"
                value={adminPassword}
              />
            </View>
          </View>

          {/* Password strength indicator */}
          {adminPassword.length > 0 ? (
            <View style={styles.strengthRow}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    adminPassword.length >= i * 4 && styles.strengthBarFilled,
                    adminPassword.length >= 12 && styles.strengthBarStrong,
                  ]}
                />
              ))}
              <Text style={styles.strengthLabel}>
                {adminPassword.length < 6
                  ? 'Too short'
                  : adminPassword.length < 8
                    ? 'Weak'
                    : adminPassword.length < 12
                      ? 'Good'
                      : 'Strong'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  topBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 6,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breadcrumb: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FFF1F1',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  section: {
    gap: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionLabelText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  field: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    color: colors.textPrimary,
    fontSize: 15,
    padding: 0,
    minHeight: 24,
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  strengthBarFilled: {
    backgroundColor: colors.warning,
  },
  strengthBarStrong: {
    backgroundColor: colors.success,
  },
  strengthLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 48,
  },
});
