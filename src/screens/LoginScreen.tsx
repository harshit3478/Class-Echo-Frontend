import { useRef, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { isLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const logScrollRef = useRef<ScrollView>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = emailValid && password.length > 0;

  const addLog = (msg: string) => {
    const ts = new Date().toISOString().slice(11, 23);
    setDebugLogs((prev) => [...prev, `[${ts}] ${msg}`]);
    setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const runNetworkTest = async () => {
    setIsTesting(true);
    setDebugLogs([]);

    addLog(`API_BASE_URL = ${API_BASE_URL}`);
    addLog(`Platform = ${Platform.OS} / ${Platform.Version}`);

    // Test 1: plain GET to base URL
    addLog('--- Test 1: GET base URL ---');
    try {
      addLog('Sending fetch...');
      const t0 = Date.now();
      const res = await fetch(API_BASE_URL + '/', { method: 'GET' });
      addLog(`Response: ${res.status} in ${Date.now() - t0}ms`);
      const body = await res.text();
      addLog(`Body: ${body.slice(0, 120)}`);
    } catch (e) {
      addLog(`FAILED: ${String(e)}`);
      if (e instanceof TypeError) addLog(`TypeError message: ${e.message}`);
    }

    // Test 2: POST login with dummy creds to check reachability
    addLog('--- Test 2: POST /auth/login ---');
    try {
      addLog('Sending fetch...');
      const t0 = Date.now();
      const res = await fetch(API_BASE_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=debug%40test.com&password=testpass',
      });
      addLog(`Response: ${res.status} in ${Date.now() - t0}ms`);
      const body = await res.text();
      addLog(`Body: ${body.slice(0, 120)}`);
    } catch (e) {
      addLog(`FAILED: ${String(e)}`);
    }

    // Test 3: XHR
    addLog('--- Test 3: XHR GET base URL ---');
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', API_BASE_URL + '/');
      xhr.timeout = 8000;
      xhr.onload = () => { addLog(`XHR status: ${xhr.status}`); resolve(); };
      xhr.onerror = () => { addLog(`XHR onerror fired`); resolve(); };
      xhr.ontimeout = () => { addLog(`XHR timed out`); resolve(); };
      xhr.send();
    });

    addLog('--- Done ---');
    setIsTesting(false);
  };

  const handleSignIn = async () => {
    if (!canSubmit || isLoading) return;
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>
            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Ionicons color="#fff" name="pulse" size={20} />
              </View>
              <Text style={styles.logoText}>ClassEcho</Text>
            </View>

            {/* Heading */}
            <View style={styles.heading}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Enter your credentials to access your portal.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  onSubmitEditing={handleSignIn}
                  placeholder="name@university.edu"
                  placeholderTextColor={colors.textPlaceholder}
                  returnKeyType="next"
                  style={[styles.input, error && !emailValid && styles.inputError]}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                </View>
                <View style={styles.passwordWrap}>
                  <TextInput
                    onChangeText={setPassword}
                    onSubmitEditing={handleSignIn}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textPlaceholder}
                    returnKeyType="done"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.passwordInput]}
                    textContentType="password"
                    value={password}
                  />
                  <Pressable
                    hitSlop={8}
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      color={colors.textMuted}
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                    />
                  </Pressable>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                disabled={!canSubmit || isLoading}
                onPress={handleSignIn}
                style={[styles.signInBtn, (!canSubmit || isLoading) && styles.signInBtnDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Ionicons color="#fff" name="arrow-forward" size={18} />
                  </>
                )}
              </Pressable>
            </View>

            {/* Sign up link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupLabel}>Don't have an account?</Text>
              <Pressable onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}> Sign up</Text>
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} ClassEcho. All rights reserved.
            </Text>
            <Pressable onPress={() => setShowDebug((v) => !v)} style={styles.debugToggle}>
              <Text style={styles.debugToggleText}>
                {showDebug ? 'Hide Debug' : 'Debug'}
              </Text>
            </Pressable>
          </View>

          {showDebug ? (
            <View style={styles.debugPanel}>
              <View style={styles.debugHeader}>
                <Text style={styles.debugTitle}>Network Debug</Text>
                <Pressable
                  disabled={isTesting}
                  onPress={runNetworkTest}
                  style={[styles.debugRunBtn, isTesting && styles.debugRunBtnDisabled]}
                >
                  {isTesting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.debugRunText}>Run Test</Text>}
                </Pressable>
              </View>
              <ScrollView
                ref={logScrollRef}
                style={styles.debugLog}
                contentContainerStyle={styles.debugLogContent}
              >
                {debugLogs.length === 0
                  ? <Text style={styles.debugLogEmpty}>Tap "Run Test" to start.</Text>
                  : debugLogs.map((line, i) => (
                    <Text key={i} selectable style={styles.debugLogLine}>{line}</Text>
                  ))}
              </ScrollView>
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
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    gap: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heading: {
    gap: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.75,
    lineHeight: 38,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: '#F97066',
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
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
  signInBtn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  signInBtnDisabled: {
    opacity: 0.5,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  debugToggle: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugToggleText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  debugPanel: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: '#0d1117',
    overflow: 'hidden',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  debugTitle: {
    color: '#e6edf3',
    fontSize: 13,
    fontWeight: '700',
  },
  debugRunBtn: {
    backgroundColor: '#238636',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  debugRunBtnDisabled: {
    opacity: 0.6,
  },
  debugRunText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  debugLog: {
    height: 260,
  },
  debugLogContent: {
    padding: 12,
    gap: 3,
  },
  debugLogEmpty: {
    color: '#8b949e',
    fontSize: 12,
    fontStyle: 'italic',
  },
  debugLogLine: {
    color: '#e6edf3',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
});
