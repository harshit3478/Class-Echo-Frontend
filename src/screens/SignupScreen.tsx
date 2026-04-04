import { Feather, Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import {
  getPublicSchoolClasses,
  getPublicSchools,
  studentSignup,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ClassOut, SchoolOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

// ── Shared field component ────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize ?? 'none'}
        keyboardType={keyboardType ?? 'default'}
        placeholder={placeholder}
        placeholderTextColor={colors.textPlaceholder}
        secureTextEntry={secureTextEntry}
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
});

// ── Progress dots ─────────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <View style={dotStyles.row}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[dotStyles.dot, s === step ? dotStyles.active : s < step ? dotStyles.done : null]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  active: { width: 24, backgroundColor: colors.accent },
  done: { backgroundColor: colors.accentDark },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export function SignupScreen({ navigation }: Props) {
  const { signInDirect } = useAuth();

  // Step 1 — credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 — school
  const [schools, setSchools] = useState<SchoolOut[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<SchoolOut | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Step 3 — class
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassOut | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load schools when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    const load = async () => {
      setLoadingSchools(true);
      try {
        setSchools(await getPublicSchools());
      } catch {
        setError('Could not load schools');
      } finally {
        setLoadingSchools(false);
      }
    };
    void load();
  }, [step]);

  // Filter schools by search
  const filteredSchools = schoolSearch.trim()
    ? schools.filter((s) => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
    : schools;

  // Load classes when a school is selected
  useEffect(() => {
    if (!selectedSchool) return;
    const load = async () => {
      setLoadingClasses(true);
      setClasses([]);
      setSelectedClass(null);
      try {
        setClasses(await getPublicSchoolClasses(selectedSchool.id));
      } catch {
        setError('Could not load classes');
      } finally {
        setLoadingClasses(false);
      }
    };
    void load();
  }, [selectedSchool]);

  function goBack() {
    setError(null);
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep((s) => s - 1);
    }
  }

  function nextStep() {
    setError(null);
    if (step === 1) {
      if (!name.trim()) { setError('Please enter your full name'); return; }
      if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!selectedSchool) { setError('Please select a school'); return; }
      setStep(3);
    }
  }

  async function handleCreateAccount() {
    if (!selectedClass) { setError('Please select a class'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const resp = await studentSignup({
        name: name.trim(),
        email: email.trim(),
        password,
        school_id: selectedSchool!.id,
        class_id: selectedClass.id,
      });
      signInDirect(resp.access_token, resp.role);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Create Account' : step === 2 ? 'Choose School' : 'Choose Class'}
          </Text>
          <StepDots step={step} />
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Step 1 — Credentials */}
      {step === 1 && (
        <View style={styles.body}>
          <Text style={styles.stepHint}>Step 1 of 3 — Your Details</Text>
          <View style={styles.form}>
            <Field autoCapitalize="words" label="Full Name" placeholder="Alex Morgan" value={name} onChangeText={setName} />
            <Field keyboardType="email-address" label="Email" placeholder="alex@school.edu" value={email} onChangeText={setEmail} />
            <Field label="Password" placeholder="Min 6 characters" secureTextEntry value={password} onChangeText={setPassword} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={nextStep} style={styles.btn}>
            <Text style={styles.btnText}>Continue</Text>
            <Ionicons color="#fff" name="arrow-forward" size={18} />
          </Pressable>
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Step 2 — School selection */}
      {step === 2 && (
        <View style={styles.bodyFlex}>
          <View style={styles.searchWrap}>
            <Text style={styles.stepHint}>Step 2 of 3 — Select Your School</Text>
            <View style={styles.searchBar}>
              <Ionicons color={colors.textMuted} name="search-outline" size={18} />
              <TextInput
                autoCapitalize="none"
                placeholder="Search schools…"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.searchInput}
                value={schoolSearch}
                onChangeText={setSchoolSearch}
              />
            </View>
          </View>

          {loadingSchools ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredSchools}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = selectedSchool?.id === item.id;
                return (
                  <Pressable
                    onPress={() => setSelectedSchool(item)}
                    style={[styles.listItem, selected && styles.listItemSelected]}
                  >
                    <View style={styles.schoolInitials}>
                      <Text style={styles.schoolInitialsText}>
                        {item.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.listItemText}>
                      <Text style={styles.listItemName}>{item.name}</Text>
                      {item.address ? <Text style={styles.listItemSub}>{item.address}</Text> : null}
                    </View>
                    {selected && <Ionicons color={colors.accent} name="checkmark-circle" size={22} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No schools found</Text>
                </View>
              }
            />
          )}

          {error ? <Text style={styles.errorBottom}>{error}</Text> : null}
          <View style={styles.bottomBtn}>
            <Pressable
              onPress={nextStep}
              style={[styles.btn, !selectedSchool && styles.btnDisabled]}
            >
              <Text style={styles.btnText}>Continue</Text>
              <Ionicons color="#fff" name="arrow-forward" size={18} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Step 3 — Class selection */}
      {step === 3 && (
        <View style={styles.bodyFlex}>
          <View style={styles.searchWrap}>
            <Text style={styles.stepHint}>
              Step 3 of 3 — Select Your Class
            </Text>
            <Text style={styles.schoolBadge}>{selectedSchool?.name}</Text>
          </View>

          {loadingClasses ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={classes}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = selectedClass?.id === item.id;
                return (
                  <Pressable
                    onPress={() => setSelectedClass(item)}
                    style={[styles.listItem, selected && styles.listItemSelected]}
                  >
                    <View style={[styles.classIcon, selected && styles.classIconSelected]}>
                      <Ionicons
                        color={selected ? '#fff' : colors.accent}
                        name="school-outline"
                        size={18}
                      />
                    </View>
                    <Text style={[styles.listItemName, styles.classItemName]}>{item.name}</Text>
                    {selected && <Ionicons color={colors.accent} name="checkmark-circle" size={22} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No classes available</Text>
                </View>
              }
            />
          )}

          {error ? <Text style={styles.errorBottom}>{error}</Text> : null}
          <View style={styles.bottomBtn}>
            <Pressable
              disabled={submitting}
              onPress={handleCreateAccount}
              style={[styles.btn, (!selectedClass || submitting) && styles.btnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Create Account</Text>
                  <Ionicons color="#fff" name="checkmark" size={18} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}
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
  headerCenter: { flex: 1, alignItems: 'center', gap: 6 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },

  body: { flex: 1, padding: 24, gap: 20 },
  bodyFlex: { flex: 1 },
  stepHint: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  form: { gap: 16 },

  btn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  loginText: { color: colors.textSecondary, fontSize: 14 },
  loginLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },

  error: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  errorBottom: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginHorizontal: 24, marginBottom: 8 },

  searchWrap: { padding: 20, gap: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },

  listContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  listItemSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  schoolInitials: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolInitialsText: { color: colors.accentDark, fontSize: 15, fontWeight: '800' },
  listItemText: { flex: 1, gap: 2 },
  listItemName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  listItemSub: { color: colors.textMuted, fontSize: 12 },

  classIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classIconSelected: { backgroundColor: colors.accent },
  classItemName: { flex: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: colors.textMuted, fontSize: 14 },

  bottomBtn: { padding: 20, paddingBottom: 8 },
  schoolBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    color: colors.accentDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
