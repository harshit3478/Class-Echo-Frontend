import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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

import { AppLogo } from '../components/AppLogo';
import { AuthInput } from '../components/AuthInput';
import { FooterMeta } from '../components/FooterMeta';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { isLoading, signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const emailValid = /\S+@\S+\.\S+/.test(username.trim());
  const canSubmit = emailValid && password.length > 0;

  const handleSignIn = async () => {
    if (!canSubmit) {
      setError('Enter a valid email and password.');
      return;
    }

    setError(null);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainSection}>
            <View style={styles.brandWrap}>
              <AppLogo />
            </View>

            <View style={styles.headerBlock}>
              <Text style={styles.title}>Access your workspace</Text>
              <Text style={styles.subtitle}>
                Sign in with the credentials issued by your institution.
              </Text>
            </View>

            <View style={styles.roleRow}>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>Super Admin</Text>
              </View>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>School Admin</Text>
              </View>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>Teacher</Text>
              </View>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>Student</Text>
              </View>
            </View>

            <View style={styles.form}>
              <AuthInput
                autoComplete="email"
                keyboardType="email-address"
                label="Email Address"
                onChangeText={setUsername}
                onSubmitEditing={handleSignIn}
                placeholder="name@university.edu"
                returnKeyType="next"
                textContentType="emailAddress"
                value={username}
              />
              <AuthInput
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                showEye
                onChangeText={setPassword}
                onSubmitEditing={handleSignIn}
                returnKeyType="done"
                textContentType="password"
                value={password}
              />
              {error ? (
                <View style={styles.errorPanel}>
                  <Text style={styles.error}>{error}</Text>
                </View>
              ) : null}
              <PrimaryButton
                disabled={!canSubmit}
                label="Sign In"
                loading={isLoading}
                onPress={handleSignIn}
              />
            </View>

            <View style={styles.supportBlock}>
              <Text style={styles.supportTitle}>Need access?</Text>
              <Text style={styles.supportBody}>
                Student self-onboarding is still being finalized. If your login
                was provisioned by an admin, use that first.
              </Text>
              <Pressable onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.supportLink}>Open student onboarding</Text>
              </Pressable>
            </View>
          </View>

          <FooterMeta />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  mainSection: {
    paddingHorizontal: 24,
    paddingTop: 84,
    paddingBottom: 64,
    gap: 28,
  },
  brandWrap: {
    paddingBottom: 4,
  },
  headerBlock: {
    gap: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.75,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  form: {
    gap: 18,
  },
  supportBlock: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 8,
  },
  supportTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  supportBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  supportLink: {
    color: colors.accentDark,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  errorPanel: {
    borderRadius: 14,
    backgroundColor: '#FFF1F1',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 18,
  },
});
